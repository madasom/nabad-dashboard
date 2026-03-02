import { prisma } from '../services/db';
import { Prisma, CommunityAlert } from '@prisma/client';

export async function listAlerts(): Promise<CommunityAlert[]> {
  return prisma.communityAlert.findMany({ orderBy: { reportedAt: 'desc' } });
}

export async function seedAlerts(initial: Prisma.CommunityAlertCreateManyInput[]) {
  const count = await prisma.communityAlert.count();
  if (count > 0) return;
  await prisma.communityAlert.createMany({
    data: initial,
    skipDuplicates: true,
  });
}
