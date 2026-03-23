import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function ensureTables() {
  await prisma.$connect();
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "firstLogin" BOOLEAN NOT NULL DEFAULT true
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false
  `);
}
