import { Router } from 'express';
import { dispatchersController } from './dispatchers.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', rbacMiddleware([...STAFF_ROLES]), dispatchersController.list);
router.get('/:id', rbacMiddleware([...STAFF_ROLES]), dispatchersController.getById);

router.post(
  '/',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  dispatchersController.create,
);

router.patch(
  '/:id',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  dispatchersController.update,
);

router.delete(
  '/:id',
  rbacMiddleware(['SUPER_ADMIN', 'COMPANY_ADMIN']),
  auditMiddleware('DISPATCHER_DELETE', 'Dispatcher', (req) => req.params.id as string),
  dispatchersController.delete,
);

export default router;
