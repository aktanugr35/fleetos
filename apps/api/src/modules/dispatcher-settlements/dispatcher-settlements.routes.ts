import { Router } from 'express';
import { dispatcherSettlementsController } from './dispatcher-settlements.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

const READ_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER', 'ACCOUNTING'] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING'] as const;

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', rbacMiddleware([...READ_ROLES]), dispatcherSettlementsController.list);
router.get('/eligible', rbacMiddleware([...READ_ROLES]), dispatcherSettlementsController.getEligible);
router.get('/:id/pdf', rbacMiddleware([...READ_ROLES]), dispatcherSettlementsController.downloadPdf);
router.get('/:id/pdf/download', rbacMiddleware([...READ_ROLES]), dispatcherSettlementsController.downloadPdf);
router.get('/:id', rbacMiddleware([...READ_ROLES]), dispatcherSettlementsController.getById);

router.post('/', rbacMiddleware([...WRITE_ROLES]), dispatcherSettlementsController.create);
router.post('/:id/pdf', rbacMiddleware([...WRITE_ROLES]), dispatcherSettlementsController.generatePdf);
router.patch(
  '/:id/approve',
  rbacMiddleware([...WRITE_ROLES]),
  auditMiddleware('DISPATCHER_SETTLEMENT_FINALIZE', 'DispatcherSettlement', (req) => req.params.id as string),
  dispatcherSettlementsController.approve,
);
router.patch('/:id/paid', rbacMiddleware([...WRITE_ROLES]), dispatcherSettlementsController.markPaid);

export default router;
