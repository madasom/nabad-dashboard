import { Router } from 'express';
import { authenticate, requirePasswordChangeComplete, requireRole } from '../middleware/auth';
import {
  createUserController,
  deleteUserController,
  listUsersController,
  updateUserController,
} from '../controllers/usersController';

const router = Router();

router.get('/', authenticate, requirePasswordChangeComplete, requireRole('admin'), listUsersController);
router.post('/', authenticate, requirePasswordChangeComplete, requireRole('admin'), createUserController);
router.put('/:id', authenticate, requirePasswordChangeComplete, requireRole('admin'), updateUserController);
router.delete('/:id', authenticate, requirePasswordChangeComplete, requireRole('admin'), deleteUserController);

export default router;
