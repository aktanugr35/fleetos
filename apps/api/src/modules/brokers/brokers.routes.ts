import { Router } from 'express';
import { brokersController } from './brokers.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { rbacMiddleware, STAFF_ROLES } from '../../middleware/rbac.middleware';
import { auditMiddleware } from '../../middleware/audit.middleware';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

const WRITE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DISPATCHER'] as const;

router.get('/', rbacMiddleware([...STAFF_ROLES]), brokersController.list);
router.get('/lookup/:mc', rbacMiddleware([...STAFF_ROLES]), brokersController.lookupByMc);
router.get('/:id', rbacMiddleware([...STAFF_ROLES]), brokersController.getById);
router.get('/:id/summary', rbacMiddleware([...STAFF_ROLES]), brokersController.getSummary);

router.post('/', rbacMiddleware([...WRITE_ROLES]), brokersController.create);
router.patch('/:id', rbacMiddleware([...WRITE_ROLES]), brokersController.update);

router.delete(
  '/:id',
  rbacMiddleware([...WRITE_ROLES]),
  auditMiddleware('BROKER_DELETE', 'Broker', (req) => req.params.id as string),
  brokersController.delete,
);

router.post('/:id/agents', rbacMiddleware([...WRITE_ROLES]), brokersController.createAgent);
router.patch('/:id/agents/:agentId', rbacMiddleware([...WRITE_ROLES]), brokersController.updateAgent);
router.delete(
  '/:id/agents/:agentId',
  rbacMiddleware([...WRITE_ROLES]),
  auditMiddleware('BROKER_AGENT_DELETE', 'BrokerAgent', (req) => req.params.agentId as string),
  brokersController.deleteAgent,
);

export default router;
