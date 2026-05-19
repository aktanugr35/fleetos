import { Router } from 'express';
import { settlementsController } from './settlements.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

/** Read-only settlement access incl. fleet staff + DRIVER (own settlements only via controller scope) */
const SETTLEMENT_READ_ROLES = [
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'DISPATCHER',
  'ACCOUNTING',
  'DRIVER',
] as const;

const SETTLEMENT_WRITE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING'] as const;

const router = Router();
router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware);

router.get('/', rbacMiddleware([...SETTLEMENT_READ_ROLES]), settlementsController.list);
router.get('/eligible', rbacMiddleware([...SETTLEMENT_READ_ROLES]), settlementsController.getEligible);
router.get('/:id/pdf', rbacMiddleware([...SETTLEMENT_READ_ROLES]), settlementsController.streamPdf);
router.get('/:id/pdf/download', rbacMiddleware([...SETTLEMENT_READ_ROLES]), settlementsController.downloadPdf);
router.get('/:id', rbacMiddleware([...SETTLEMENT_READ_ROLES]), settlementsController.getById);

router.post('/:id/pdf', rbacMiddleware([...SETTLEMENT_WRITE_ROLES]), settlementsController.generatePdf);
router.post('/', rbacMiddleware([...SETTLEMENT_WRITE_ROLES]), settlementsController.create);
router.patch(
  '/:id/approve',
  rbacMiddleware([...SETTLEMENT_WRITE_ROLES]),
  auditMiddleware('SETTLEMENT_FINALIZE', 'Settlement', (req) => req.params.id as string),
  settlementsController.approve
);
router.post(
  '/:id/finalize',
  rbacMiddleware([...SETTLEMENT_WRITE_ROLES]),
  auditMiddleware('SETTLEMENT_FINALIZE', 'Settlement', (req) => req.params.id as string),
  settlementsController.approve
);
router.patch('/:id/paid', rbacMiddleware([...SETTLEMENT_WRITE_ROLES]), settlementsController.markPaid);

export default router;
