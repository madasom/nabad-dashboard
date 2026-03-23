import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, signJwt } from '../middleware/auth';
import { changeOwnPassword, verifyPassword } from '../repositories/usersRepository';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(3) });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(3),
  newPassword: z.string().min(8),
});

export function loginController(req: AuthenticatedRequest, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid login payload', errors: parsed.error.flatten() });
  }

  verifyPassword(parsed.data.email, parsed.data.password)
    .then((user) => {
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      const token = signJwt({
        id: user.id,
        email: user.email,
        role: user.role as any,
        name: user.name,
        firstLogin: user.firstLogin,
        mustChangePassword: user.mustChangePassword,
      });
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          firstLogin: user.firstLogin,
          mustChangePassword: user.mustChangePassword,
        },
      });
    })
    .catch((err) => res.status(500).json({ message: err.message ?? 'Login failed' }));
}

export async function changePasswordController(req: AuthenticatedRequest, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid password payload', errors: parsed.error.flatten() });
  }
  if (!req.user) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const user = await changeOwnPassword(req.user.id, parsed.data.currentPassword, parsed.data.newPassword);
    if (!user) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
      firstLogin: user.firstLogin,
      mustChangePassword: user.mustChangePassword,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        firstLogin: user.firstLogin,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message ?? 'Password change failed' });
  }
}
