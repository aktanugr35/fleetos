import { Router } from 'express';
import { setupController } from './setup.controller';

const router = Router();

router.get('/status', setupController.getStatus.bind(setupController));
router.post('/', setupController.setup.bind(setupController));

export default router;
