import { Router } from 'express';
import { deductionsController } from './deductions.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware);

router.get('/', rbacMiddleware([...STAFF_ROLES]), deductionsController.list);
router.post('/', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING']), deductionsController.create);
router.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING']), deductionsController.update);
router.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']), deductionsController.delete);

export default router;
