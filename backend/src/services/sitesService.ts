import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { SiteRow, listSites, upsertSites } from '../repositories/sitesRepository';
import { createImportJob, listPendingImports, markImportJob, markTempSaved, bumpImportedRows, PendingImportJob } from '../repositories/importsRepository';

function yes(val: any) {
  return typeof val === 'string' && val.trim().toLowerCase() === 'yes';
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

export async function getSites() {
  return listSites();
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

function countRows(buffer: Buffer): number {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });
    return records.length;
  } catch {
    return 0;
  }
}

export async function importXlsx(buffer: Buffer, jobId?: string, startFrom = 0) {
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
        id,
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
        raw: row,
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
  return { imported: processed, created, updated };
}

const tempDir = path.resolve(process.cwd(), 'tmp', 'imports');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

let processing = false;

export async function startImportJob(buffer: Buffer, filename: string) {
  const totalRows = countRows(buffer);
  const job = await createImportJob(filename, undefined, false, totalRows);
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
    const startFrom = existingCount; // resume exactly from current count
    console.log(`[import] job ${job.id} starting parse from ${tempPath}, existing=${existingCount}, startFrom=${startFrom}`);
    const { imported, created, updated, totalUsable } = await importXlsx(fileBuffer, job.id, startFrom);
    console.log(
      `[import] job ${job.id} finished import, rowsImportedThisRun=${imported} (created=${created}, updated=${updated}), totalUsable=${totalUsable}`,
    );
    await markImportJob(job.id, 'done');
  } catch (err: any) {
    console.error(`[import] job ${job.id} failed`, err);
    await markImportJob(job.id, 'failed', err?.message ?? 'Import failed');
  }
}

export async function triggerProcessing() {
  console.log("went here ::::")
  if (processing) return;
  console.log("went here again ::: ::::")
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
