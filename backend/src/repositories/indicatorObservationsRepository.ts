import { Prisma } from '@prisma/client';
import { prisma } from '../services/db';

export type IndicatorObservationRow = {
  id: string;
  importJobId?: string | null;
  source: string;
  dataset: string;
  indicator: 'penta3' | 'gam';
  locationName: string;
  district?: string | null;
  region?: string | null;
  periodLabel: string;
  periodDate?: Date | null;
  numerator?: number | null;
  denominator?: number | null;
  value: number;
  notes?: string | null;
  raw?: Record<string, unknown> | null;
};

export async function upsertIndicatorObservations(rows: IndicatorObservationRow[]) {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const data = {
      importJobId: row.importJobId ?? null,
      source: row.source,
      dataset: row.dataset,
      indicator: row.indicator,
      locationName: row.locationName,
      district: row.district ?? null,
      region: row.region ?? null,
      periodLabel: row.periodLabel,
      periodDate: row.periodDate ?? null,
      numerator: row.numerator ?? null,
      denominator: row.denominator ?? null,
      value: row.value,
      notes: row.notes ?? null,
      raw: (row.raw ?? null) as Prisma.InputJsonValue,
    };

    try {
      await prisma.indicatorObservation.update({
        where: { id: row.id },
        data,
      });
      updated += 1;
    } catch {
      await prisma.indicatorObservation.create({
        data: { id: row.id, ...data },
      });
      created += 1;
    }
  }

  return { created, updated };
}

export async function listIndicatorObservations(indicator?: 'penta3' | 'gam') {
  const rows = await prisma.indicatorObservation.findMany({
    where: indicator ? { indicator } : undefined,
    orderBy: [{ periodDate: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map((row: any) => ({
    id: row.id,
    importJobId: row.importJobId,
    source: row.source,
    dataset: row.dataset,
    indicator: row.indicator as 'penta3' | 'gam',
    locationName: row.locationName,
    district: row.district,
    region: row.region,
    periodLabel: row.periodLabel,
    periodDate: row.periodDate,
    numerator: row.numerator,
    denominator: row.denominator,
    value: row.value,
    notes: row.notes,
    raw: row.raw as Record<string, unknown> | null,
  }));
}
