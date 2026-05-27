import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';
import { fuelTollController } from './fuel-toll.controller';

const router = Router();
const manageRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTING'] as const;

router.use(authMiddleware, tenantMiddleware);

router.get('/fuel-cards', rbacMiddleware(STAFF_ROLES), fuelTollController.listFuelCards);
router.post('/fuel-cards', rbacMiddleware([...manageRoles]), fuelTollController.createFuelCard);
router.patch('/fuel-cards/:id', rbacMiddleware([...manageRoles]), fuelTollController.updateFuelCard);

router.get('/fuel-transactions', rbacMiddleware(STAFF_ROLES), fuelTollController.listFuelTransactions);
router.post('/fuel-transactions', rbacMiddleware([...manageRoles]), fuelTollController.createFuelTransaction);
router.patch('/fuel-transactions/:id', rbacMiddleware([...manageRoles]), fuelTollController.updateFuelTransaction);

router.get('/toll-devices', rbacMiddleware(STAFF_ROLES), fuelTollController.listTollDevices);
router.post('/toll-devices', rbacMiddleware([...manageRoles]), fuelTollController.createTollDevice);
router.patch('/toll-devices/:id', rbacMiddleware([...manageRoles]), fuelTollController.updateTollDevice);

router.get('/toll-transactions', rbacMiddleware(STAFF_ROLES), fuelTollController.listTollTransactions);
router.post('/toll-transactions', rbacMiddleware([...manageRoles]), fuelTollController.createTollTransaction);
router.patch('/toll-transactions/:id', rbacMiddleware([...manageRoles]), fuelTollController.updateTollTransaction);

export default router;
