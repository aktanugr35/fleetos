import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

// Public routes
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/me/password', authMiddleware, authController.changePassword);

export default router;
