import { Router } from 'express';
import { driversController } from './drivers.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware);

const DRIVER_READ_ROLES = [...STAFF_ROLES] as const;

router.get('/', rbacMiddleware([...DRIVER_READ_ROLES]), driversController.list);
router.get('/:id', rbacMiddleware([...DRIVER_READ_ROLES]), driversController.getById);
router.get('/:id/loads', rbacMiddleware([...DRIVER_READ_ROLES]), driversController.getLoads);
router.get('/:id/compliance', rbacMiddleware([...DRIVER_READ_ROLES]), driversController.getCompliance);

router.post('/',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  driversController.create
);

router.patch('/:id',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  driversController.update
);

router.delete(
  '/:id',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  auditMiddleware('DRIVER_DELETE', 'Driver', (req) => req.params.id as string),
  driversController.delete
);

export default router;
