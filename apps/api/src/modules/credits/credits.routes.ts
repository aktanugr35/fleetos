import { Router } from 'express';
import { creditsController } from './credits.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware);

router.get('/', rbacMiddleware([...STAFF_ROLES, 'DRIVER']), creditsController.list);
router.post('/', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING']), creditsController.create);
router.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING']), creditsController.update);
router.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), creditsController.delete);

export default router;
