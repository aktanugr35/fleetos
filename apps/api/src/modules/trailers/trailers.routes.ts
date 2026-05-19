import { Router } from 'express';
import { trailersController } from './trailers.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', rbacMiddleware(STAFF_ROLES), trailersController.list);
router.get('/:id', rbacMiddleware(STAFF_ROLES), trailersController.getById);
router.post('/', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), trailersController.create);
router.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), trailersController.update);
router.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), trailersController.delete);

export default router;
