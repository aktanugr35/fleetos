import { Router } from 'express';
import { trucksController } from './trucks.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', rbacMiddleware(STAFF_ROLES), trucksController.list);
router.get('/:id', rbacMiddleware(STAFF_ROLES), trucksController.getById);
router.get('/:id/compliance', rbacMiddleware(STAFF_ROLES), trucksController.getCompliance);
router.post('/', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), trucksController.create);
router.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), trucksController.update);
router.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), trucksController.delete);

export default router;
