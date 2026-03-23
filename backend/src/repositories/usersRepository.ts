import { prisma } from '../services/db';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({ orderBy: { email: 'asc' } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: string;
}): Promise<User> {
  const hashed = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      password: hashed,
      role: data.role,
      firstLogin: true,
      mustChangePassword: true,
    },
  });
}

export async function updateUser(
  id: string,
  data: {
    email?: string;
    name?: string;
    password?: string;
    role?: string;
  },
): Promise<User> {
  const updateData: Partial<User> = {};
  if (typeof data.email === 'string') updateData.email = data.email;
  if (typeof data.name === 'string') updateData.name = data.name;
  if (typeof data.role === 'string') updateData.role = data.role;
  if (typeof data.password === 'string' && data.password.trim()) {
    updateData.password = await bcrypt.hash(data.password, 10);
    updateData.firstLogin = true;
    updateData.mustChangePassword = true;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<User | null> {
  const user = await findUserById(id);
  if (!user) return null;

  const isHashed = user.password.startsWith('$2');
  const currentPasswordMatches = isHashed
    ? await bcrypt.compare(currentPassword, user.password)
    : currentPassword === user.password;

  if (!currentPasswordMatches) return null;

  const hashed = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id },
    data: {
      password: hashed,
      firstLogin: false,
      mustChangePassword: false,
    },
  });
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
        firstLogin: false,
        mustChangePassword: false,
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
