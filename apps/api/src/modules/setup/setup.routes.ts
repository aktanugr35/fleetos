import { Router } from 'express';
import { setupController } from './setup.controller';
import { setupLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.get('/status', setupController.getStatus.bind(setupController));
router.post('/', setupLimiter, setupController.setup.bind(setupController));

export default router;
