import { createHash, randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { SiteRow, listSites, upsertSites } from '../repositories/sitesRepository';
import { createImportJob, listPendingImports, markImportJob, markTempSaved, bumpImportedRows, PendingImportJob } from '../repositories/importsRepository';
import { IndicatorObservationRow, listIndicatorObservations, upsertIndicatorObservations } from '../repositories/indicatorObservationsRepository';

type ImportSource = 'IOM' | 'MOH';
export type ImportDataset =
  | 'IOM_ETT'
  | 'MOH_ETT'
  | 'MOH_PENTA3_YEARLY'
  | 'MOH_PENTA3_MONTHLY'
  | 'IDP_SITE_REGISTRY';

export const VALID_IMPORT_DATASETS: ImportDataset[] = [
  'IOM_ETT',
  'MOH_ETT',
  'MOH_PENTA3_YEARLY',
  'MOH_PENTA3_MONTHLY',
  'IDP_SITE_REGISTRY',
];

type RegistrySiteRow = {
  settlementName: string;
  district: string | null;
  region: string | null;
  lat: number | null;
  lon: number | null;
  households: number | null;
  raw: Record<string, unknown>;
};

function yes(val: any) {
  return typeof val === 'string' && val.trim().toLowerCase() === 'yes';
}

function normalizeImportSource(value?: string): ImportSource {
  return value?.toUpperCase() === 'MOH' ? 'MOH' : 'IOM';
}

export function isImportDataset(value?: string): value is ImportDataset {
  return VALID_IMPORT_DATASETS.includes(value as ImportDataset);
}

function normalizeImportDataset(value: string): ImportDataset {
  if (!isImportDataset(value)) {
    throw new Error(`Unsupported import dataset: ${value}`);
  }
  return value;
}

function datasetSource(dataset: ImportDataset): ImportSource {
  return dataset.startsWith('MOH') ? 'MOH' : 'IOM';
}

function decorateFilename(filename: string, dataset: ImportDataset) {
  return `[${dataset}] ${filename}`;
}

function getImportDatasetFromFilename(filename: string): ImportDataset {
  const match = filename.match(/^\[([A-Z0-9_]+)\]\s/);
  return normalizeImportDataset(match?.[1] ?? 'IOM_ETT');
}

function mapNeeds(row: Record<string, any>) {
  return {
    protection: yes(row['Needs - General Protection Services']) || yes(row['Needs - GBV Services']) || yes(row['Needs - Child Protection Services']),
    food: yes(row['Needs - General Food distribution']),
    health: yes(row['Needs - Health Services']),
    wash: yes(row['Needs - Water Services']) || yes(row['Needs - Sanitation Services (latrines etc)']) || yes(row['Needs - Hygiene services (soap, hygiene kits, etc)']),
    newArrivals: yes(row['New arrivals since last week']),
  };
}

function normalizeText(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .replace(/health\s*center/g, '')
    .replace(/centre/g, 'center')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueTerms(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => normalizeText(value)).filter((value) => value.length >= 4))];
}

function scorePentaMatch(site: SiteRow, observation: IndicatorObservationRow) {
  const facility = normalizeText(observation.locationName);
  if (!facility) return 0;
  const candidates = uniqueTerms([
    site.settlement_name,
    site.district,
    site.region,
    site.catchment,
    site.operationalZone,
    typeof site.raw?.healthFacility === 'string' ? site.raw.healthFacility : null,
    typeof site.raw?.['Health Facility'] === 'string' ? String(site.raw['Health Facility']) : null,
  ]);

  let score = 0;
  for (const candidate of candidates) {
    if (candidate === facility) score = Math.max(score, 100);
    else if (candidate.includes(facility) || facility.includes(candidate)) score = Math.max(score, 70);
    else {
      const facilityParts = facility.split(' ');
      const candidateParts = candidate.split(' ');
      const overlap = facilityParts.filter((part) => part.length >= 4 && candidateParts.includes(part)).length;
      if (overlap > 0) score = Math.max(score, overlap * 20);
    }
  }

  return score;
}

function choosePentaObservation(site: SiteRow, observations: IndicatorObservationRow[]) {
  let best: IndicatorObservationRow | null = null;
  let bestScore = 0;

  for (const observation of observations) {
    const score = scorePentaMatch(site, observation);
    if (!best || score > bestScore || (score === bestScore && (observation.periodDate?.getTime() ?? 0) > (best.periodDate?.getTime() ?? 0))) {
      best = observation;
      bestScore = score;
    }
  }

  return bestScore >= 40 ? best : null;
}

function chooseGamObservation(site: SiteRow, observations: IndicatorObservationRow[]) {
  const siteDistrict = normalizeText(site.district);
  const siteRegion = normalizeText(site.region);

  const districtMatch = observations.find((observation) => normalizeText(observation.district) === siteDistrict && siteDistrict);
  if (districtMatch) return districtMatch;

  const regionMatch = observations.find((observation) => normalizeText(observation.region) === siteRegion && siteRegion);
  return regionMatch ?? null;
}

function hasRegistrySource(site: SiteRow) {
  return Boolean(site.raw?.__registrySource) || site.raw?.__source === 'REGISTRY';
}

function scoreRegistryEttMatch(registrySite: SiteRow, ettSite: SiteRow) {
  const registryName = normalizeText(registrySite.settlement_name).replace(/\bsite\b/g, '').trim();
  const ettName = normalizeText(ettSite.settlement_name).replace(/\bsite\b/g, '').trim();
  const registryDistrict = normalizeText(registrySite.district);
  const ettDistrict = normalizeText(ettSite.district);
  const registryRegion = normalizeText(registrySite.region);
  const ettRegion = normalizeText(ettSite.region);

  let score = 0;

  if (registryDistrict && ettDistrict && registryDistrict === ettDistrict) score += 30;
  if (registryRegion && ettRegion && registryRegion === ettRegion) score += 15;
  if (registryName && ettName) {
    if (registryName === ettName) score += 100;
    else if (registryName.includes(ettName) || ettName.includes(registryName)) score += 70;
    else {
      const registryParts = registryName.split(' ');
      const ettParts = ettName.split(' ');
      const overlap = registryParts.filter((part) => part.length >= 4 && ettParts.includes(part)).length;
      score += overlap * 20;
    }
  }

  return score;
}

function chooseEttOverlay(registrySite: SiteRow, ettSites: SiteRow[]) {
  let best: SiteRow | null = null;
  let bestScore = 0;

  for (const site of ettSites) {
    const score = scoreRegistryEttMatch(registrySite, site);
    if (
      !best ||
      score > bestScore ||
      (score === bestScore && (site.arrivals14d ?? 0) > (best.arrivals14d ?? 0))
    ) {
      best = site;
      bestScore = score;
    }
  }

  return bestScore >= 40 ? best : null;
}

function chooseRegistryOverlay(ettSite: SiteRow, registrySites: SiteRow[]) {
  let best: SiteRow | null = null;
  let bestScore = 0;

  for (const site of registrySites) {
    const score = scoreRegistryEttMatch(site, ettSite);
    if (!best || score > bestScore || (score === bestScore && (site.households ?? 0) > (best.households ?? 0))) {
      best = site;
      bestScore = score;
    }
  }

  return bestScore >= 40 ? best : null;
}

function overlayRegistryWithEtt(registrySite: SiteRow, ettSite: SiteRow | null): SiteRow {
  if (!ettSite) return registrySite;

  return {
    ...registrySite,
    arrivals14d: registrySite.arrivals14d ?? ettSite.arrivals14d,
    arrivalsMale: registrySite.arrivalsMale ?? ettSite.arrivalsMale,
    arrivalsFemale: registrySite.arrivalsFemale ?? ettSite.arrivalsFemale,
    arrivalsChildren: registrySite.arrivalsChildren ?? ettSite.arrivalsChildren,
    departures14d: registrySite.departures14d ?? ettSite.departures14d,
    mainCause: registrySite.mainCause ?? ettSite.mainCause,
    hazardCause: registrySite.hazardCause ?? ettSite.hazardCause,
    conflictCause: registrySite.conflictCause ?? ettSite.conflictCause,
    mainNeed: registrySite.mainNeed ?? ettSite.mainNeed,
    needs: registrySite.needs ?? ettSite.needs,
    responses: registrySite.responses ?? ettSite.responses,
    movementType: registrySite.movementType ?? ettSite.movementType,
    displacementCount: registrySite.displacementCount ?? ettSite.displacementCount,
    journeyTime: registrySite.journeyTime ?? ettSite.journeyTime,
    originRegion: registrySite.originRegion ?? ettSite.originRegion,
    originDistrict: registrySite.originDistrict ?? ettSite.originDistrict,
    originLocation: registrySite.originLocation ?? ettSite.originLocation,
    dataCollectionWeek: registrySite.dataCollectionWeek ?? ettSite.dataCollectionWeek,
    raw: {
      ...ettSite.raw,
      ...registrySite.raw,
      __ettOverlaySource: {
        id: ettSite.id,
        settlementName: ettSite.settlement_name,
        district: ettSite.district,
        region: ettSite.region,
      },
    },
  };
}

function overlayEttWithRegistry(ettSite: SiteRow, registrySite: SiteRow | null): SiteRow {
  if (!registrySite) return ettSite;

  return {
    ...ettSite,
    households: ettSite.households ?? registrySite.households,
    lat: ettSite.lat ?? registrySite.lat,
    lon: ettSite.lon ?? registrySite.lon,
    classification: ettSite.classification ?? registrySite.classification,
    locationType: ettSite.locationType ?? registrySite.locationType,
    catchment: ettSite.catchment ?? registrySite.catchment,
    operationalZone: ettSite.operationalZone ?? registrySite.operationalZone,
    raw: {
      ...ettSite.raw,
      __registrySource: registrySite.raw?.__registrySource ?? registrySite.raw ?? null,
      __registryOverlaySource: {
        id: registrySite.id,
        settlementName: registrySite.settlement_name,
        district: registrySite.district,
        region: registrySite.region,
      },
    },
  };
}

export async function getSites() {
  const [sites, penta3Observations, gamObservations] = await Promise.all([
    listSites(),
    listIndicatorObservations('penta3'),
    listIndicatorObservations('gam'),
  ]);

  const registrySites = sites.filter(hasRegistrySource);
  const ettSites = sites.filter((site) => !hasRegistrySource(site));
  const enrichedEttSites = ettSites.map((ettSite) =>
    overlayEttWithRegistry(ettSite, chooseRegistryOverlay(ettSite, registrySites)),
  );
  const unmatchedRegistrySites = registrySites
    .filter((registrySite) => !chooseEttOverlay(registrySite, ettSites))
    .map((registrySite) => overlayRegistryWithEtt(registrySite, null));
  const baseSites = [...enrichedEttSites, ...unmatchedRegistrySites];

  return baseSites.map((site: SiteRow) => {
    const pentaObservation = choosePentaObservation(site, penta3Observations);
    const gamObservation = chooseGamObservation(site, gamObservations);

    return {
      ...site,
      penta3: pentaObservation?.value ?? site.penta3,
      gam: gamObservation?.value ?? site.gam,
      raw: {
        ...site.raw,
        ...(pentaObservation
          ? {
              __penta3Source: {
                dataset: pentaObservation.dataset,
                locationName: pentaObservation.locationName,
                periodLabel: pentaObservation.periodLabel,
                value: pentaObservation.value,
              },
            }
          : {}),
        ...(gamObservation
          ? {
              __gamSource: {
                dataset: gamObservation.dataset,
                locationName: gamObservation.locationName,
                periodLabel: gamObservation.periodLabel,
                value: gamObservation.value,
              },
            }
          : {}),
      },
    };
  });
}

export async function getIndicatorObservations(indicator?: 'penta3' | 'gam') {
  return listIndicatorObservations(indicator);
}

const gubadleySites: SiteRow[] = [
  { id: 'GUB-CEEL-SIYAAD', settlement_name: 'Ceel Siyaad Site', district: 'Gubadley', region: 'Banadir', lat: 2.083695, lon: 45.401881, households: 776, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-DAN-HIIL', settlement_name: 'Dan Hiil Site', district: 'Gubadley', region: 'Banadir', lat: 2.083938, lon: 45.401829, households: 852, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-BANAANEEY', settlement_name: 'Banaaneey Site', district: 'Gubadley', region: 'Banadir', lat: 2.083892, lon: 45.402141, households: 511, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-DEEB-CADDE', settlement_name: 'Deeb Cadde Site', district: 'Gubadley', region: 'Banadir', lat: 2.084492, lon: 45.404458, households: 568, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-CEEL-SHUUTE', settlement_name: 'Ceel Shuute Site', district: 'Gubadley', region: 'Banadir', lat: 2.086258, lon: 45.404271, households: 714, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-DAN-GUUD', settlement_name: 'dan guud site', district: 'Gubadley', region: 'Banadir', lat: 2.086629, lon: 45.404079, households: 812, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-CALLUD', settlement_name: 'Callud Site', district: 'Gubadley', region: 'Banadir', lat: 2.087126, lon: 45.404302, households: 707, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-DAN-YAR', settlement_name: 'Dan Yar Site', district: 'Gubadley', region: 'Banadir', lat: 2.087445, lon: 45.404404, households: 674, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-DAACAD', settlement_name: 'Daacad Site', district: 'Gubadley', region: 'Banadir', lat: 2.087445, lon: 45.404936, households: 845, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-IL-FEYD', settlement_name: 'Il Feyd Site', district: 'Gubadley', region: 'Banadir', lat: 2.087789, lon: 45.404602, households: 797, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-BIL-CIL', settlement_name: 'Bil Cil Site', district: 'Gubadley', region: 'Banadir', lat: 2.088137, lon: 45.404846, households: 515, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-AADAN-YABAAL', settlement_name: 'Aadan Yabaal Site', district: 'Gubadley', region: 'Banadir', lat: 2.088426, lon: 45.404952, households: 623, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-BOOS-HARERI', settlement_name: 'Boos Hareri Site', district: 'Gubadley', region: 'Banadir', lat: 2.088222, lon: 45.417781, households: 617, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-GODGALE', settlement_name: 'Godgale Site', district: 'Gubadley', region: 'Banadir', lat: 2.087907, lon: 45.417814, households: 698, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-CEEL-MULUQ', settlement_name: 'Ceel Muluq Site', district: 'Gubadley', region: 'Banadir', lat: 2.088301, lon: 45.418112, households: 734, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-DHOGONLE', settlement_name: 'Dhogonle Site', district: 'Gubadley', region: 'Banadir', lat: 2.08828, lon: 45.41846, households: 581, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-GUNRAY', settlement_name: 'Gunray Site', district: 'Gubadley', region: 'Banadir', lat: 2.08831, lon: 45.419184, households: 447, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-AL-CADDAAL', settlement_name: 'Al Caddaal Site', district: 'Gubadley', region: 'Banadir', lat: 2.079336, lon: 45.40578, households: 192, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-ALKOWTHAR', settlement_name: 'Alkowthar Site', district: 'Gubadley', region: 'Banadir', lat: 2.087953, lon: 45.416966, households: 587, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-NASTEEX', settlement_name: 'Nasteex Site', district: 'Gubadley', region: 'Banadir', lat: 2.084317, lon: 45.401763, households: 590, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-WADANI', settlement_name: 'Wadani Site', district: 'Gubadley', region: 'Banadir', lat: 2.084339, lon: 45.401561, households: 256, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-IFTIN', settlement_name: 'Iftin Site', district: 'Gubadley', region: 'Banadir', lat: 2.084441, lon: 45.401852, households: 166, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-CALOOLA-CAD', settlement_name: 'Caloola cad Site', district: 'Gubadley', region: 'Banadir', lat: 2.087046, lon: 45.404635, households: 522, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-ALFARDOWS', settlement_name: 'Alfardows Site', district: 'Gubadley', region: 'Banadir', lat: 2.079418, lon: 45.411491, households: 110, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-GALHARUUR', settlement_name: 'Galharuur Site', district: 'Gubadley', region: 'Banadir', lat: 2.088112, lon: 45.417337, households: 412, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
  { id: 'GUB-BURCADE', settlement_name: 'Burcade Site', district: 'Gubadley', region: 'Banadir', lat: 2.083391, lon: 45.393872, households: 577, arrivals14d: null, penta3: null, gam: null, safety: null, needs: null, raw: {}, ochaRegionPcode: null, ochaDistrictPcode: null, operationalZone: null, catchment: null, classification: null, locationType: null, arrivalsMale: null, arrivalsFemale: null, arrivalsChildren: null, departures14d: null, mainCause: null, hazardCause: null, conflictCause: null, mainNeed: null, responses: undefined, movementType: undefined, displacementCount: undefined, journeyTime: undefined, originRegion: undefined, originDistrict: undefined, originLocation: undefined, dataCollectionWeek: undefined },
];

export async function ensureSeedGubadleySites() {
  await upsertSites(gubadleySites);
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseNumeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function findHeaderRow(rows: unknown[][], dataset: ImportDataset) {
  return rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeHeader(cell));
    if (dataset === 'MOH_PENTA3_YEARLY') {
      return headers.includes('periodname') && headers.some((header) => /penta/.test(header));
    }
    if (dataset === 'MOH_PENTA3_MONTHLY') {
      return headers.some((header) => header === 'periodidan' || header === 'periodname') && headers.some((header) => /penta|pentavale/.test(header));
    }
    return headers.includes('settlement name') || headers.includes('site name');
  });
}

function buildPeriodDate(periodLabel: string, dataset: ImportDataset) {
  if (dataset === 'MOH_PENTA3_YEARLY') {
    const year = Number(periodLabel);
    return Number.isFinite(year) ? new Date(Date.UTC(year, 0, 1)) : null;
  }

  const parsed = new Date(periodLabel);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSiteRegistryWorkbook(buffer: Buffer, startFrom = 0) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });

  const mapped = records
    .map((row): RegistrySiteRow | null => {
      const siteName = row['IDP Site Name'] ?? row['Site Name'] ?? row['Settlement Name'] ?? row['site_name'];
      if (!siteName) return null;
      return {
        settlementName: String(siteName).trim(),
        district: row['District'] ?? 'Gubadley',
        region: row['Region'] ?? 'Banadir',
        lat: parseNumeric(row['Latitude']),
        lon: parseNumeric(row['Longitude']),
        households: parseNumeric(row['Households']),
        raw: { ...row, __source: 'REGISTRY' },
      };
    })
    .filter((row): row is RegistrySiteRow => row !== null && Boolean(row.settlementName));

  return { rows: mapped.slice(startFrom), totalUsable: mapped.length };
}

function pentaHeaderMatches(header: string, dose: 1 | 3) {
  const normalized = normalizeHeader(header);
  return (
    normalized.includes(`penta ${dose}`) ||
    normalized.includes(`penta${dose}`) ||
    normalized.includes(`penta ${dose}st`) ||
    normalized.includes(`penta ${dose}rd`) ||
    normalized.includes(`penta${dose}st`) ||
    normalized.includes(`penta${dose}rd`) ||
    normalized.includes(`pentavalent ${dose}`) ||
    normalized.includes(`pentavalent${dose}`) ||
    normalized.includes(`pentavale ${dose}`) ||
    normalized.includes(`pentavale${dose}`) ||
    normalized.includes(`pentavalent ${dose}st`) ||
    normalized.includes(`pentavalent ${dose}rd`) ||
    normalized.includes(`pentavalent${dose}st`) ||
    normalized.includes(`pentavalent${dose}rd`) ||
    normalized.includes(`pentavale${dose}st`) ||
    normalized.includes(`pentavale${dose}rd`)
  );
}

function parsePenta3Workbook(buffer: Buffer, dataset: Extract<ImportDataset, 'MOH_PENTA3_YEARLY' | 'MOH_PENTA3_MONTHLY'>, jobId?: string, startFrom = 0) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const observations: IndicatorObservationRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
    const headerRowIndex = findHeaderRow(rows, dataset);
    if (headerRowIndex < 0) continue;

    const facilityName = String(rows[Math.max(0, headerRowIndex - 1)]?.find((cell) => String(cell ?? '').trim()) ?? sheetName).trim() || sheetName;
    const headers = (rows[headerRowIndex] ?? []).map((cell) => String(cell ?? '').trim());
    const normalizedHeaders = headers.map((header) => normalizeHeader(header));
    const periodIndex = normalizedHeaders.findIndex((header) => header === 'periodname' || header === 'periodidan');
    const penta1Index = headers.findIndex((header) => pentaHeaderMatches(header, 1));
    const penta3Index = headers.findIndex((header) => pentaHeaderMatches(header, 3));

    if (periodIndex < 0 || penta1Index < 0 || penta3Index < 0) continue;

    rows.slice(headerRowIndex + 1).forEach((row) => {
      const periodLabel = String(row[periodIndex] ?? '').trim();
      if (!periodLabel) return;

      const denominator = parseNumeric(row[penta1Index]);
      const numerator = parseNumeric(row[penta3Index]);
      if (!denominator || !numerator || denominator <= 0) return;

      const value = Math.max(0, Math.min(100, Number(((numerator / denominator) * 100).toFixed(1))));
      const periodDate = buildPeriodDate(periodLabel, dataset);
      const id = createHash('sha1')
        .update(`${dataset}|${facilityName}|${periodLabel}|${numerator}|${denominator}`)
        .digest('hex');

      observations.push({
        id,
        importJobId: jobId ?? null,
        source: 'MOH',
        dataset,
        indicator: 'penta3',
        locationName: facilityName,
        periodLabel,
        periodDate,
        numerator,
        denominator,
        value,
        notes: 'Computed as Penta 3 doses divided by Penta 1 doses from imported MOH workbook.',
        raw: {
          sheetName,
          headers,
          row,
        },
      });
    });
  }

  const usable = observations.sort((a, b) => (b.periodDate?.getTime() ?? 0) - (a.periodDate?.getTime() ?? 0));
  const rows = usable.slice(startFrom);
  return { observations: rows, totalUsable: usable.length };
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function deriveGamDistrict(label: string) {
  const explicitDistrict = label.match(/^([A-Za-z ]+?)\s+District/i)?.[1]?.trim();
  if (explicitDistrict) return explicitDistrict;

  const urban = label.match(/^([A-Za-z ]+?)\s+(Urban|IDPs?)/i)?.[1]?.trim();
  if (urban) return urban;

  return null;
}

function deriveGamRegion(label: string) {
  const region = label.match(/\(([^)]+)\)\s*$/)?.[1]?.split(/[,&/]/)[0]?.trim();
  return region || null;
}

export async function syncGamFromFsnau(season = '2025/gu') {
  const response = await fetch(`https://fsnau.org/nutrition/?season=${encodeURIComponent(season)}`);
  if (!response.ok) {
    throw new Error(`FSNAU sync failed with status ${response.status}`);
  }

  const html = await response.text();
  const bodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!bodyMatch) {
    throw new Error('Could not find nutrition table on FSNAU page');
  }

  const rows = [...bodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  const observations = rows
    .map((match): IndicatorObservationRow | null => {
      const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => stripTags(cell[1]));
      if (cells.length < 2) return null;
      const locationName = cells[0];
      const value = parseNumeric(cells[1]);
      if (!locationName || value === null) return null;

      const district = deriveGamDistrict(locationName);
      const region = deriveGamRegion(locationName);
      const id = createHash('sha1').update(`FSNAU_GAM|${season}|${locationName}|${value}`).digest('hex');

      return {
        id,
        source: 'FSNAU',
        dataset: 'FSNAU_GAM',
        indicator: 'gam',
        locationName,
        district,
        region,
        periodLabel: season,
        periodDate: new Date(),
        value,
        notes: 'Synced from FSNAU nutrition seasonal summary table.',
        raw: {
          season,
          row: cells,
        },
      };
    })
    .filter((row): row is IndicatorObservationRow => row !== null);

  const { created, updated } = await upsertIndicatorObservations(observations);
  return { imported: created + updated, created, updated, season };
}

function countRows(buffer: Buffer, dataset: ImportDataset): number {
  try {
    if (dataset === 'MOH_PENTA3_YEARLY' || dataset === 'MOH_PENTA3_MONTHLY') {
      return parsePenta3Workbook(buffer, dataset).totalUsable;
    }
    if (dataset === 'IDP_SITE_REGISTRY') {
      return parseSiteRegistryWorkbook(buffer).totalUsable;
    }
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false }).length;
  } catch {
    return 0;
  }
}

const tempDir = path.resolve(process.cwd(), 'tmp', 'imports');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

let processing = false;

export async function importXlsx(buffer: Buffer, sourceInput?: string, jobId?: string, startFrom = 0) {
  const source = normalizeImportSource(sourceInput);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });
  console.log(`[import] parsed ${records.length} raw rows from sheet "${sheetName}"`);

  const mapped: SiteRow[] = records
    .map((row, idx) => {
      const id =
        row['Settlement ID'] ||
        row['settlement_id'] ||
        row['Site Code'] ||
        row['Site code'] ||
        row['site_code'] ||
        `ETT-${idx}-${Date.now()}` ||
        randomUUID();
      const lat = row['Latitude'] ? Number(row['Latitude']) : null;
      const lon = row['Longitude'] ? Number(row['Longitude']) : null;
      return {
        id: `${source}-${id}`,
        importJobId: jobId ?? null,
        settlement_name: row['Settlement Name'] ?? row['Settlement name'] ?? row['settlement_name'] ?? row['Site name'] ?? row['site_name'],
        district: row['District Name'] ?? row['district'] ?? row['District'],
        region: row['Region Name'] ?? row['region'] ?? row['Region'],
        ochaRegionPcode: row['OCHA Region Pcode'] ?? null,
        ochaDistrictPcode: row['OCHA District Pcode'] ?? null,
        operationalZone: row['Operational Zone'] ?? null,
        catchment: row['Catchment'] ?? null,
        classification: row['Settlement Classification'] ?? null,
        locationType: row['Location Type'] ?? null,
        lat,
        lon,
        households: row['Total HH'] ? Number(row['Total HH']) : null,
        arrivals14d: row['Total new arrivals since last week'] ? Number(row['Total new arrivals since last week']) : null,
        arrivalsMale: row['Number of Males (18 and above) since last week'] ? Number(row['Number of Males (18 and above) since last week']) : null,
        arrivalsFemale: row['Number of Females (18 and above) since last week'] ? Number(row['Number of Females (18 and above) since last week']) : null,
        arrivalsChildren: row['Number of Children under 18 since last week'] ? Number(row['Number of Children under 18 since last week']) : null,
        departures14d: row['Total number of departures since last week'] ? Number(row['Total number of departures since last week']) : null,
        mainCause: row['Main Cause of Displacement'] ?? null,
        hazardCause: row['Main Cause of Displacement (type of Natural hazard)'] ?? null,
        conflictCause: row['Main Cause of Displacement (type of conflict)'] ?? null,
        mainNeed: row['Main need for the majority of IDPs in settlement'] ?? null,
        needs: mapNeeds(row),
        responses: {
          food: yes(row['Response - General food distribution to new arrivals']),
          shelter: yes(row['Response - Shelter Materials']),
          nfi: yes(row['Response - NFIs']),
          health: yes(row['Response - Health Services']),
          nutrition: yes(row['Response - Nutrition Services']),
          water: yes(row['Response - Water Services']),
          sanitation: yes(row['Response - Sanitation Services (latrines etc)']),
          hygiene: yes(row['Response - Hygiene Services (soap, hygiene kits, etc)']),
          protection: yes(row['Response - General Protection Services']),
          gbv: yes(row['Response - GBV Services']),
          cccm: yes(row['Response - CCCM Site Improvement']) || yes(row['Response - CCCM Site Decongestion']) || yes(row['Response - CCCM Complaints and Feedback Mechanism']) || yes(row['Response - CCCM Plot Allocation']),
        },
        movementType: row['Type of movement of the majority of the new arrivals'] ?? null,
        displacementCount: row['How many times was the majority displaced since they left place of origin'] ?? null,
        journeyTime: row['How long did the whole journey take for the majority'] ?? null,
        originRegion: row['Somalia Region of Origin'] ?? row['Origin_Region_country'] ?? null,
        originDistrict: row['Somalia District of Origin'] ?? row['Origin_District_country'] ?? null,
        originLocation: row['Somalia Location of Origin'] ?? null,
        dataCollectionWeek: row['Data Collection Week'] ?? null,
        penta3: row['Penta3 coverage'] ? Number(row['Penta3 coverage']) : null,
        gam: row['GAM prevalence'] ? Number(row['GAM prevalence']) : null,
        safety: row['Safety Index'] ? Number(row['Safety Index']) : null,
        raw: { ...row, __source: source },
      };
    })
    .filter((r) => r.settlement_name);

  if (records.length === 0) {
    console.warn(`[import] job ${jobId ?? 'manual'} parsed 0 rows; check sheet name/structure`);
  }

  const totalUsable = mapped.length;
  if (totalUsable === 0) {
    console.warn(
      `[import] job ${jobId ?? 'manual'} filtered rows is 0. Possible missing "Settlement Name" column.`,
    );
    return { imported: 0, created: 0, updated: 0, totalUsable };
  }

  if (startFrom >= totalUsable) {
    console.log(
      `[import] job ${jobId ?? 'manual'} already imported ${startFrom}/${totalUsable} rows; skipping.`,
    );
    return { imported: 0, created: 0, updated: 0, totalUsable };
  }

  const rows: SiteRow[] = mapped.slice(startFrom);

  console.log(`[import] job ${jobId ?? 'manual'} mapped ${rows.length}/${totalUsable} rows after filtering, startFrom=${startFrom}`);

  const { created, updated } = await upsertSites(rows);
  const processed = created + updated;
  if (jobId) {
    const newImportedTotal = startFrom + processed;
    await bumpImportedRows(jobId, newImportedTotal);
  }
  console.log(
    `[import] job ${jobId ?? 'manual'} stored ${processed} site rows (created=${created}, updated=${updated}), startFrom=${startFrom}`,
  );
  return { imported: processed, created, updated, totalUsable };
}

async function importPentaWorkbook(
  buffer: Buffer,
  dataset: Extract<ImportDataset, 'MOH_PENTA3_YEARLY' | 'MOH_PENTA3_MONTHLY'>,
  jobId?: string,
  startFrom = 0,
) {
  const { observations, totalUsable } = parsePenta3Workbook(buffer, dataset, jobId, startFrom);
  if (totalUsable === 0) {
    return { imported: 0, created: 0, updated: 0, totalUsable };
  }

  const { created, updated } = await upsertIndicatorObservations(observations);
  const processed = created + updated;
  if (jobId) {
    await bumpImportedRows(jobId, startFrom + processed);
  }
  return { imported: processed, created, updated, totalUsable };
}

async function importSiteRegistryWorkbook(buffer: Buffer, jobId?: string, startFrom = 0) {
  const { rows, totalUsable } = parseSiteRegistryWorkbook(buffer, startFrom);
  if (totalUsable === 0) {
    return { imported: 0, created: 0, updated: 0, totalUsable };
  }

  const existingSites = await listSites();
  const mergedRows: SiteRow[] = [];

  for (const row of rows) {
    const normalizedName = normalizeText(row.settlementName);
    const normalizedDistrict = normalizeText(row.district);
    const exactMatches = existingSites.filter((site) => {
      const sameName = normalizeText(site.settlement_name) === normalizedName;
      const sameDistrict = normalizedDistrict ? normalizeText(site.district) === normalizedDistrict : true;
      return sameName && sameDistrict;
    });

    if (exactMatches.length > 0) {
      for (const match of exactMatches) {
        mergedRows.push({
          ...match,
          importJobId: jobId ?? null,
          households: row.households ?? match.households,
          lat: row.lat ?? match.lat,
          lon: row.lon ?? match.lon,
          district: row.district ?? match.district,
          region: row.region ?? match.region,
          classification: match.classification ?? 'IDP site (camp or camp like setting)',
          locationType: match.locationType ?? 'Registry',
          raw: {
            ...match.raw,
            __registrySource: row.raw,
          },
        });
      }
      continue;
    }

    const slug = normalizedName.replace(/\s+/g, '-').toUpperCase();
    mergedRows.push({
      id: `REG-${slug}`,
      importJobId: jobId ?? null,
      settlement_name: row.settlementName,
      district: row.district,
      region: row.region,
      ochaRegionPcode: null,
      ochaDistrictPcode: null,
      operationalZone: null,
      catchment: null,
      classification: 'IDP site (camp or camp like setting)',
      locationType: 'Registry',
      lat: row.lat,
      lon: row.lon,
      households: row.households,
      arrivals14d: null,
      arrivalsMale: null,
      arrivalsFemale: null,
      arrivalsChildren: null,
      departures14d: null,
      mainCause: null,
      hazardCause: null,
      conflictCause: null,
      mainNeed: null,
      penta3: null,
      gam: null,
      safety: null,
      needs: null,
      responses: undefined,
      movementType: undefined,
      displacementCount: undefined,
      journeyTime: undefined,
      originRegion: undefined,
      originDistrict: undefined,
      originLocation: undefined,
      dataCollectionWeek: undefined,
      raw: { ...row.raw },
    });
  }

  const { created, updated } = await upsertSites(mergedRows);
  const processed = created + updated;
  if (jobId) {
    await bumpImportedRows(jobId, startFrom + processed);
  }
  return { imported: processed, created, updated, totalUsable };
}

export async function startImportJob(buffer: Buffer, filename: string, datasetInput: string) {
  const dataset = normalizeImportDataset(datasetInput);
  const totalRows = countRows(buffer, dataset);
  const job = await createImportJob(decorateFilename(filename, dataset), undefined, false, totalRows);
  try {
    const tempPath = path.join(tempDir, `${job.id}-${filename}`);
    fs.writeFileSync(tempPath, buffer);
    await markTempSaved(job.id, tempPath);
    console.log(`[import] job ${job.id} queued, saved to temp ${tempPath}, totalRows=${totalRows}`);
    triggerProcessing();
  } catch (err: any) {
    await markImportJob(job.id, 'failed', err?.message ?? 'Failed to save temp file');
    console.error(`[import] job ${job.id} failed to save temp`, err);
  }
  return job.id;
}

async function processJob(job: PendingImportJob, tempPath: string) {
  try {
    const fileBuffer = fs.readFileSync(tempPath);
    const existingCount = job._count?.sites ?? 0;
    const startFrom = job.importedRows ?? 0;
    const dataset = getImportDatasetFromFilename(job.filename);
    console.log(`[import] job ${job.id} starting parse from ${tempPath}, existing=${existingCount}, startFrom=${startFrom}`);
    const result =
      dataset === 'MOH_PENTA3_YEARLY' || dataset === 'MOH_PENTA3_MONTHLY'
        ? await importPentaWorkbook(fileBuffer, dataset, job.id, startFrom)
        : dataset === 'IDP_SITE_REGISTRY'
          ? await importSiteRegistryWorkbook(fileBuffer, job.id, startFrom)
        : await importXlsx(fileBuffer, datasetSource(dataset), job.id, startFrom);
    const { imported, created, updated, totalUsable } = result;
    console.log(
      `[import] job ${job.id} finished import, rowsImportedThisRun=${imported} (created=${created}, updated=${updated}), totalUsable=${totalUsable}`,
    );
    const finalImported = (job.importedRows ?? 0) + imported;
    if (totalUsable === 0) {
      await markImportJob(job.id, 'failed', 'No usable rows found in workbook');
    } else if (finalImported === 0) {
      await markImportJob(job.id, 'failed', 'No usable rows were imported');
    } else if (finalImported < totalUsable) {
      await markImportJob(job.id, 'partial', `Imported ${finalImported} of ${totalUsable} usable rows`);
    } else {
      await markImportJob(job.id, 'done');
    }
  } catch (err: any) {
    console.error(`[import] job ${job.id} failed`, err);
    await markImportJob(job.id, 'failed', err?.message ?? 'Import failed');
  }
}

export async function triggerProcessing() {
  if (processing) return;
  processing = true;
  console.log('[import] background worker starting');
  setImmediate(async () => {
    try {
      const pending: PendingImportJob[] = await listPendingImports();
      console.log(`[import] ${pending.length} pending jobs found`);
      if (pending.length === 0) {
        console.log('[import] no pending jobs, worker exiting');
      }
      for (const job of pending) {
        const existingCount = job._count?.sites ?? 0;
        console.log(`[import] job ${job.id} has ${existingCount} rows already imported`);
        console.log(`[import] job ${job.id} has ${job.importedRows ?? 0} rows already imported`);
        if (existingCount > (job.importedRows ?? 0)) {
          await bumpImportedRows(job.id, existingCount);
          console.log(`[import] job ${job.id} resume progress: importedRows set to ${existingCount}`);
        }else{
          console.log(`[import] job ${job.id} no new rows imported since last check, skipping processing`);
        }
        if (job.tempPath) {
          console.log(`[import] processing job ${job.id} from ${job.tempPath}`);
          await processJob(job, job.tempPath);
        } else {
          console.error(`[import] job ${job.id} missing tempPath`);
          await markImportJob(job.id, 'failed', 'Temp file missing');
        }
      }
    } finally {
      console.log('[import] background worker done');
      processing = false;
    }
  });
}
