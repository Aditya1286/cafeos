import { Router } from 'express';
import { getOrders, getOrderById, searchOrders, updateOrderStatus, getOrderBill } from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceTenant);

router.get('/', getOrders);
router.get('/search', searchOrders);
router.get('/:id', getOrderById);
router.get('/:id/bill', getOrderBill);
router.put('/:id/status', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), updateOrderStatus);

export default router;

