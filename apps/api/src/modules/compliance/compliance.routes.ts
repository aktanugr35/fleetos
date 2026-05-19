import { Router } from 'express';
import { complianceController } from './compliance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/overview', rbacMiddleware(STAFF_ROLES), complianceController.getOverview);

export default router;
