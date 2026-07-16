import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { driverIntakeController } from './driver-intake.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';

const publicIntakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Try again later.' },
  },
});

const router = Router();

router.get(
  '/public/driver-intake/:token',
  publicIntakeLimiter,
  driverIntakeController.getPublicContext,
);
router.post(
  '/public/driver-intake/:token',
  publicIntakeLimiter,
  driverIntakeController.submitPublicForm,
);

router.use(authMiddleware, tenantMiddleware);

router.post(
  '/drivers/:driverId/intake-link',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  driverIntakeController.createLink,
);
router.get(
  '/drivers/:driverId/intake-status',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER', 'ACCOUNTING']),
  driverIntakeController.getStatus,
);

export default router;
