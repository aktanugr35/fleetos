import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { csrfCookieGuard } from '../../middleware/csrf.middleware';
import { authLimiter, passwordResetLimiter, refreshLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.post('/login', authLimiter, authController.login);
router.post('/refresh', csrfCookieGuard, refreshLimiter, authController.refresh);

router.post('/logout', csrfCookieGuard, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/me/password', authMiddleware, passwordResetLimiter, authController.changePassword);

export default router;
