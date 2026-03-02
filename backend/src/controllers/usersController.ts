import { Request, Response } from 'express';
import { listUsers } from '../repositories/usersRepository';

export async function listUsersController(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email })));
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch users' });
  }
}
