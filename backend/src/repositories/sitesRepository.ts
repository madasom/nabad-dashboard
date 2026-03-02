import { prisma } from '../services/db';
import { Prisma } from '@prisma/client';

export type SiteRow = {
  id: string;
  importJobId?: string | null;
  settlement_name: string;
  district: string | null;
  region: string | null;
  ochaRegionPcode: string | null;
  ochaDistrictPcode: string | null;
  operationalZone: string | null;
  catchment: string | null;
  classification: string | null;
  locationType: string | null;
  lat: number | null;
  lon: number | null;
  households: number | null;
  arrivals14d: number | null;
  arrivalsMale: number | null;
  arrivalsFemale: number | null;
  arrivalsChildren: number | null;
  departures14d: number | null;
  mainCause: string | null;
  hazardCause: string | null;
  conflictCause: string | null;
  mainNeed: string | null;
  penta3: number | null;
  gam: number | null;
  safety: number | null;
  needs: Record<string, boolean> | null;
  responses?: Record<string, boolean> | null;
  movementType?: string | null;
  displacementCount?: string | null;
  journeyTime?: string | null;
  originRegion?: string | null;
  originDistrict?: string | null;
  originLocation?: string | null;
  dataCollectionWeek?: string | null;
  raw: Record<string, any>;
};

export async function listSites(): Promise<SiteRow[]> {
  const rows = await prisma.site.findMany({ orderBy: { settlementName: 'asc' } });
  return rows.map((r) => ({
    id: r.id,
    settlement_name: r.settlementName,
    district: r.district,
    region: r.region,
    ochaRegionPcode: r.ochaRegionPcode,
    ochaDistrictPcode: r.ochaDistrictPcode,
    operationalZone: r.operationalZone,
    catchment: r.catchment,
    classification: r.classification,
    locationType: r.locationType,
    lat: r.lat,
    lon: r.lon,
    households: r.households,
    arrivals14d: r.arrivals14d,
    arrivalsMale: r.arrivalsMale,
    arrivalsFemale: r.arrivalsFemale,
    arrivalsChildren: r.arrivalsChildren,
    departures14d: r.departures14d,
    mainCause: r.mainCause,
    hazardCause: r.hazardCause,
    conflictCause: r.conflictCause,
    mainNeed: r.mainNeed,
    penta3: r.penta3,
    gam: r.gam,
    safety: r.safety,
    needs: r.needs as any,
    responses: r.responses as any,
    movementType: r.movementType,
    displacementCount: r.displacementCount,
    journeyTime: r.journeyTime,
    originRegion: r.originRegion,
    originDistrict: r.originDistrict,
    originLocation: r.originLocation,
    dataCollectionWeek: r.dataCollectionWeek,
    raw: r.raw as any,
  }));
}

export async function upsertSites(rows: SiteRow[]): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const r of rows) {
    const data = {
      importJobId: r.importJobId ?? null,
      settlementName: r.settlement_name,
      district: r.district,
      region: r.region,
      ochaRegionPcode: r.ochaRegionPcode,
      ochaDistrictPcode: r.ochaDistrictPcode,
      operationalZone: r.operationalZone,
      catchment: r.catchment,
      classification: r.classification,
      locationType: r.locationType,
      lat: r.lat,
      lon: r.lon,
      households: r.households,
      arrivals14d: r.arrivals14d,
      arrivalsMale: r.arrivalsMale,
      arrivalsFemale: r.arrivalsFemale,
      arrivalsChildren: r.arrivalsChildren,
      departures14d: r.departures14d,
      mainCause: r.mainCause,
      hazardCause: r.hazardCause,
      conflictCause: r.conflictCause,
      mainNeed: r.mainNeed,
      penta3: r.penta3,
      gam: r.gam,
      safety: r.safety,
      needs: r.needs as Prisma.InputJsonValue,
      responses: r.responses as Prisma.InputJsonValue,
      movementType: r.movementType,
      displacementCount: r.displacementCount,
      journeyTime: r.journeyTime,
      originRegion: r.originRegion,
      originDistrict: r.originDistrict,
      originLocation: r.originLocation,
      dataCollectionWeek: r.dataCollectionWeek,
      raw: r.raw as Prisma.InputJsonValue,
    };

    try {
      await prisma.site.update({
        where: { id: r.id },
        data,
      });
      updated += 1;

    } catch (err: any) {
      await prisma.site.create({
        data: { id: r.id, ...data },
      });
      created += 1;
    }
  }

  return { created, updated };
}
