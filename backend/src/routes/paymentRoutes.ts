import { Router } from 'express';
import { processPayment, getLedgerTransactions, getMyRemittances, markRemittanceClaimedPaid } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

// Public / Customer payment endpoint
router.post('/process', processPayment);

// Owner/Staff Ledger endpoint
router.get('/ledger', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getLedgerTransactions);

// Owner/Staff: what the business currently owes the platform in commission, and by when
router.get('/remittances', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getMyRemittances);

// Owner/Staff: self-report that outstanding commission was paid via the platform's UPI QR
router.put('/remittances/mark-paid', protect, enforceBusiness, restrictTo('OWNER', 'MANAGER'), markRemittanceClaimedPaid);

export default router;
