import { Router } from 'express';
import multer from 'multer';
import { companiesController } from './companies.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { AppError } from '../../middleware/errorHandler.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';
import { emailTestLimiter } from '../../middleware/rateLimit.middleware';
import { emailSettingsController } from './email-settings.controller';

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (file.mimetype === 'image/svg+xml' || name.endsWith('.svg')) {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'SVG logos are not allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.get(
  '/',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN']),
  companiesController.listAll
);
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN']),
  companiesController.create
);

const tenantScoped = Router();
tenantScoped.use(authMiddleware, tenantMiddleware);

tenantScoped.get('/me', companiesController.getMe);
tenantScoped.get('/me/logo', companiesController.getLogo);
tenantScoped.patch('/me', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), companiesController.updateMe);
tenantScoped.post(
  '/me/logo',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  logoUpload.single('logo'),
  companiesController.uploadLogo
);
tenantScoped.delete('/me/logo', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), companiesController.deleteLogo);

const emailSettingsRoles = rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']);
tenantScoped.get('/me/email-settings', emailSettingsRoles, emailSettingsController.get);
tenantScoped.put(
  '/me/email-settings',
  emailSettingsRoles,
  auditMiddleware('EMAIL_SETTINGS_UPDATE', 'CompanyEmailSettings'),
  emailSettingsController.upsert,
);
tenantScoped.delete(
  '/me/email-settings',
  emailSettingsRoles,
  auditMiddleware('EMAIL_SETTINGS_DELETE', 'CompanyEmailSettings'),
  emailSettingsController.remove,
);
tenantScoped.post('/me/email-settings/test', emailSettingsRoles, emailTestLimiter, emailSettingsController.sendTest);

router.use(tenantScoped);

export default router;
