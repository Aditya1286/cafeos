import { Router } from 'express';
import { requireDemoKey, tick, status } from './demo.controller';

// Mounted at /api/v1/demo (server.ts). See ./README.md.
const router = Router();

router.use(requireDemoKey);

router.post('/tick', tick);
router.get('/status', status);

export default router;
