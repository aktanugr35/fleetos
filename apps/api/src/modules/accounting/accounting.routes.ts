import { Router } from 'express';
import { FLEET_RBAC_MATRIX } from '@haulyard/shared-types';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, type Role } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';
import { accountingController } from './accounting.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware, rbacMiddleware(FLEET_RBAC_MATRIX['accounting:view'] as Role[]));

const canWrite = rbacMiddleware(FLEET_RBAC_MATRIX['accounting:write'] as Role[]);

router.get('/summary', accountingController.summary);
router.get('/entries', accountingController.list);
router.post('/entries', canWrite, auditMiddleware('ACCOUNTING_ENTRY_CREATE', 'AccountingEntry'), accountingController.create);
router.put(
  '/entries/:id',
  canWrite,
  auditMiddleware('ACCOUNTING_ENTRY_UPDATE', 'AccountingEntry', (req) => req.params.id as string),
  accountingController.update,
);
router.delete(
  '/entries/:id',
  canWrite,
  auditMiddleware('ACCOUNTING_ENTRY_DELETE', 'AccountingEntry', (req) => req.params.id as string),
  accountingController.delete,
);

export default router;
