import { Router } from 'express';
import { loadsController } from './loads.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

const LOAD_WRITE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER'] as const;

const router = Router();
router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware);

const READ_ROLES = [...STAFF_ROLES, 'DRIVER'] as const;

router.get('/', rbacMiddleware([...READ_ROLES]), loadsController.list);
router.get('/stats', rbacMiddleware([...STAFF_ROLES]), loadsController.getStats);
router.get('/:id', rbacMiddleware([...READ_ROLES]), loadsController.getById);
router.post('/', rbacMiddleware([...LOAD_WRITE_ROLES]), loadsController.create);
router.patch(
  '/:id',
  rbacMiddleware([...LOAD_WRITE_ROLES]),
  auditMiddleware('LOAD_UPDATE', 'Load', (req) => req.params.id as string),
  loadsController.update
);
router.delete(
  '/:id',
  rbacMiddleware([...LOAD_WRITE_ROLES]),
  auditMiddleware('LOAD_DELETE', 'Load', (req) => req.params.id as string),
  loadsController.delete,
);

export default router;
