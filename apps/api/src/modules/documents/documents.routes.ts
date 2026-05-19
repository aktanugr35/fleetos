import { Router } from 'express';
import multer from 'multer';
import { documentsController } from './documents.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';
import { AppError } from '../../middleware/errorHandler.middleware';

const router = Router();

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF and image files are allowed'));
    }
  },
});

router.use(authMiddleware, tenantMiddleware);

router.post(
  '/upload',
  rbacMiddleware(STAFF_ROLES),
  upload.single('file'),
  documentsController.upload
);
router.get('/', rbacMiddleware(STAFF_ROLES), documentsController.list);
router.get('/:id/download', rbacMiddleware(STAFF_ROLES), documentsController.download);
router.get('/:id', rbacMiddleware(STAFF_ROLES), documentsController.getById);
router.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), documentsController.delete);

export default router;
