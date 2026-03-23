import { Request, Response } from 'express';
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser,
} from '../repositories/usersRepository';
import { AuthenticatedRequest } from '../middleware/auth';

function sanitizeUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

export async function listUsersController(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    res.json(users.map(sanitizeUser));
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch users' });
  }
}

export async function createUserController(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const name = String(req.body?.name ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!email || !name || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'A user with that email already exists' });
    }

    const user = await createUser({ email, name, password, role: 'admin' });
    res.status(201).json(sanitizeUser(user));
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to create user' });
  }
}

export async function updateUserController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : undefined;
    const password = typeof req.body?.password === 'string' ? req.body.password : undefined;
    if (password !== undefined && password.trim() && password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (email && email !== existingUser.email) {
      const emailOwner = await findUserByEmail(email);
      if (emailOwner && emailOwner.id !== id) {
        return res.status(409).json({ message: 'A user with that email already exists' });
      }
    }

    const user = await updateUser(id, {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(password !== undefined ? { password } : {}),
    });

    res.json(sanitizeUser(user));
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to update user' });
  }
}

export async function deleteUserController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (req.user?.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await deleteUser(id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to delete user' });
  }
}
