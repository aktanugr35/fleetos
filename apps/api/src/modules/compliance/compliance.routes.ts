import { Router } from 'express';
import { complianceController } from './compliance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

const MANAGE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER', 'ACCOUNTING'] as const;
const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN'] as const;

router.get('/overview', rbacMiddleware(STAFF_ROLES), complianceController.getOverview);
router.get('/items', rbacMiddleware(STAFF_ROLES), complianceController.list);
router.get('/settings', rbacMiddleware(STAFF_ROLES), complianceController.getSettings);
router.get('/records/:id/history', rbacMiddleware(STAFF_ROLES), complianceController.getRecordHistory);
router.get('/entity/:entityType/:entityId', rbacMiddleware(STAFF_ROLES), complianceController.getEntityRecords);

router.post('/records', rbacMiddleware([...MANAGE_ROLES]), complianceController.upsertRecord);
router.post('/records/mark-na', rbacMiddleware([...MANAGE_ROLES]), complianceController.markNotApplicable);
router.patch('/settings/:typeId', rbacMiddleware([...ADMIN_ROLES]), complianceController.updateSetting);

export default router;
