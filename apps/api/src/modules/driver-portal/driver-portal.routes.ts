import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { linkedDriverMiddleware } from '../../middleware/linkedDriver.middleware';
import { driverPortalController } from './driver-portal.controller';

const router = Router();

router.use(authMiddleware, tenantMiddleware, linkedDriverMiddleware, rbacMiddleware(['DRIVER']));

router.get('/summary', driverPortalController.getSummary);
router.get('/statements', driverPortalController.getStatements);
router.get('/compliance', driverPortalController.getCompliance);
router.get('/loads', driverPortalController.getLoads);
router.get('/fuel', driverPortalController.getFuel);

export default router;
