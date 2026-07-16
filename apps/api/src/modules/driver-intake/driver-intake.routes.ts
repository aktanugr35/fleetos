import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { driverIntakeController } from './driver-intake.controller';
import { REQUIRED_INTAKE_DOCUMENTS } from './driver-intake.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { AppError } from '../../middleware/errorHandler.middleware';

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

const intakeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: REQUIRED_INTAKE_DOCUMENTS.length },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only image files are allowed'));
    }
  },
}).fields(REQUIRED_INTAKE_DOCUMENTS.map((d) => ({ name: d.category, maxCount: 1 })));

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
router.post(
  '/public/driver-intake/:token/documents',
  publicIntakeLimiter,
  intakeUpload,
  driverIntakeController.submitDocuments,
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
