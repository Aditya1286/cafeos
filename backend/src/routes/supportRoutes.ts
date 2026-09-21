import { Router } from 'express';
import { createTicketAsOwner } from '../controllers/supportController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';

const router = Router();

router.use(protect, enforceBusiness);

// Any authenticated business role (OWNER/MANAGER/RECEPTIONIST/STAFF/INVENTORY_MANAGER) can ask
// for help — support tickets always go to the platform's own team, never to another business role.
router.post('/tickets', createTicketAsOwner);

export default router;
