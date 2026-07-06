import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

const MANAGE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const;

const router = Router();
router.use(authMiddleware, tenantMiddleware, rbacMiddleware([...MANAGE_ROLES]));

router.get('/', usersController.list);
router.get('/:id', usersController.getById);
router.post('/', auditMiddleware('CREATE', 'User'), usersController.create);
router.patch('/:id', auditMiddleware('UPDATE', 'User', (req) => req.params.id as string), usersController.update);
router.delete(
  '/:id',
  auditMiddleware('DEACTIVATE', 'User', (req) => req.params.id as string),
  usersController.deactivate,
);

export default router;
