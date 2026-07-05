import { Router } from 'express';
import { geoController } from './geo.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/zip/:zip', rbacMiddleware(STAFF_ROLES), geoController.lookupZip);

export default router;
