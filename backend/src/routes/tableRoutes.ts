import { Router } from 'express';
import { getTables, createTable, getTableQRCode, deleteTable } from '../controllers/tableController';
import { protect } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceTenant);

router.get('/', getTables);
router.post('/', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), createTable);
router.get('/:id/qr', getTableQRCode);
router.delete('/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), deleteTable);

export default router;
