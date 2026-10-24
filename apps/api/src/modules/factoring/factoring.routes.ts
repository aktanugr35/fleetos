import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';
import { factoringController } from './factoring.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware, rbacMiddleware([...STAFF_ROLES]));

router.get('/loads', factoringController.list);
router.post(
  '/loads/:id/submit',
  auditMiddleware('LOAD_BILLING_SUBMIT', 'Load', (req) => req.params.id as string),
  factoringController.submit,
);
router.put(
  '/loads/:id/fee',
  auditMiddleware('LOAD_FACTORING_FEE_UPDATE', 'Load', (req) => req.params.id as string),
  factoringController.updateFee,
);
router.post(
  '/loads/:id/undo',
  auditMiddleware('LOAD_BILLING_UNDO', 'Load', (req) => req.params.id as string),
  factoringController.undo,
);

export default router;
