import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { LOGOS_DIR } from '../../config/paths';
import { companiesController } from './companies.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { AppError } from '../../middleware/errorHandler.middleware';

if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, LOGOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `company-${req.tenantId}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Logo must be PNG, JPG, WEBP, GIF, or SVG'));
    }
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
tenantScoped.patch('/me', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), companiesController.updateMe);
tenantScoped.post(
  '/me/logo',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  logoUpload.single('logo'),
  companiesController.uploadLogo
);
tenantScoped.delete('/me/logo', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), companiesController.deleteLogo);

router.use(tenantScoped);

export default router;
