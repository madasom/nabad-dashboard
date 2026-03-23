import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { changePasswordController, loginController } from '../controllers/authController';

const router = Router();

router.post('/login', loginController);
router.post('/change-password', authenticate, changePasswordController);

export default router;
