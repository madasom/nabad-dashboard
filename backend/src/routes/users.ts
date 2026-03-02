import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listUsersController } from '../controllers/usersController';

const router = Router();

router.get('/', authenticate, listUsersController);

export default router;
