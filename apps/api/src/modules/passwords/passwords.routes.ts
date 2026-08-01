import { Router } from 'express';
import { passwordsController } from './passwords.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const;

router.get('/', rbacMiddleware(STAFF_ROLES), passwordsController.list);
router.get('/:id', rbacMiddleware(STAFF_ROLES), passwordsController.getOne);
router.post('/', rbacMiddleware([...ADMIN_ROLES]), passwordsController.create);
router.patch('/:id', rbacMiddleware([...ADMIN_ROLES]), passwordsController.update);
router.delete('/:id', rbacMiddleware([...ADMIN_ROLES]), passwordsController.delete);

export default router;
