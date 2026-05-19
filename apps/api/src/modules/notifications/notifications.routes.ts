import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { STAFF_ROLES } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', rbacMiddleware(STAFF_ROLES), notificationsController.list);
router.patch('/read-all', rbacMiddleware(STAFF_ROLES), notificationsController.markAllRead);
router.patch('/:id/read', rbacMiddleware(STAFF_ROLES), notificationsController.markRead);

export default router;
