import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware);

router.get('/dashboard', rbacMiddleware(STAFF_ROLES), reportsController.getDashboard);
router.get('/revenue-chart', rbacMiddleware(STAFF_ROLES), reportsController.getRevenueChart);
router.get('/brokers', rbacMiddleware(STAFF_ROLES), reportsController.getBrokerSummary);
router.get('/operational-analytics', rbacMiddleware(STAFF_ROLES), reportsController.getOperationalAnalytics);
router.get('/driver-loads/export', rbacMiddleware(STAFF_ROLES), reportsController.exportDriverLoads);

export default router;
