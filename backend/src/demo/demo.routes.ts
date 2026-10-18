import { Router } from 'express';
import { requireDemoKey, tick, status, pulse, clearPulse } from './demo.controller';

// Mounted at /api/v1/demo (server.ts). See ./README.md.
const router = Router();

router.use(requireDemoKey);

router.post('/tick', tick);
router.get('/status', status);
router.post('/pulse', pulse);
router.post('/pulse/clear', clearPulse);

export default router;
