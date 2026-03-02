import { prisma } from '../services/db';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({ orderBy: { email: 'asc' } });
}

export async function ensureSeedUser() {
  const exists = await prisma.user.findFirst();
  if (!exists) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        id: 'u1',
        email: 'admin@nabad.org',
        name: 'Admin User',
        password: hashed,
        role: 'admin',
      },
    });
  }
}

export async function verifyPassword(email: string, plain: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isHashed = user.password.startsWith('$2');
  let valid = false;

  if (isHashed) {
    valid = await bcrypt.compare(plain, user.password);
  } else {
    valid = plain === user.password;
    if (valid) {
      const hashed = await bcrypt.hash(plain, 10);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    }
  }

  if (!valid) return null;
  return user;
}
