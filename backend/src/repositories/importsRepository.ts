import { prisma } from '../services/db';
import { ImportJob } from '@prisma/client';
import crypto from 'crypto';

export async function createImportJob(
  filename: string,
  tempPath?: string,
  savedTemp = false,
  totalRows?: number,
): Promise<ImportJob> {
  return prisma.importJob.create({
    data: { id: crypto.randomUUID(), filename, status: 'pending', tempPath, savedTemp, totalRows, importedRows: 0 },
  });
}

export async function markImportJob(id: string, status: string, message?: string) {
  return prisma.importJob.update({
    where: { id },
    data: { status, message, finishedAt: new Date() },
  });
}

export async function markTempSaved(id: string, tempPath: string) {
  return prisma.importJob.update({
    where: { id },
    data: { tempPath, savedTemp: true },
  });
}

export async function setTotalRows(id: string, totalRows: number) {
  return prisma.importJob.update({ where: { id }, data: { totalRows } });
}

export async function bumpImportedRows(id: string, count: number) {
  return prisma.importJob.update({
    where: { id },
    data: { importedRows: count },
  });
}

export async function listImportJobs(limit = 20): Promise<ImportJob[]> {
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { _count: { select: { sites: true } } },
  });

  // If importedRows is not tracked, fall back to counting related sites.
  return jobs.map((j) => {
    const imported = Math.max(j.importedRows ?? 0, j._count.sites);
    const { _count, ...rest } = j as any;
    return { ...rest, importedRows: imported } as ImportJob;
  });
}

export type PendingImportJob = ImportJob & { _count: { sites: number } };

export async function listPendingImports(): Promise<PendingImportJob[]> {
  return prisma.importJob.findMany({
    where: { status: 'pending', tempPath: { not: null } },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { sites: true } } },
  }) as Promise<PendingImportJob[]>;
}
