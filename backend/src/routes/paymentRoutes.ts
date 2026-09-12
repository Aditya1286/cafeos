import { Router } from 'express';
import { processPayment, getLedgerTransactions } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

// Public / Customer payment endpoint
router.post('/process', processPayment);

// Owner/Staff Ledger endpoint
router.get('/ledger', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getLedgerTransactions);

export default router;
