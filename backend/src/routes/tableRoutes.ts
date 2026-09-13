import { Router } from 'express';
import { getTables, createTable, getTableQRCode, deleteTable, toggleTableActive } from '../controllers/tableController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.get('/', getTables);
router.post('/', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), createTable);
router.get('/:id/qr', getTableQRCode);
router.put('/:id/toggle', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), toggleTableActive);
router.delete('/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), deleteTable);

export default router;
