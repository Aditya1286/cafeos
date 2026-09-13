import { Router } from 'express';
import { getOrders, getOrderById, searchOrders, updateOrderStatus, bulkUpdateOrderStatus, confirmOrderPayment, getOrderBill } from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.get('/', getOrders);
router.get('/search', searchOrders);
router.get('/:id', getOrderById);
router.get('/:id/bill', getOrderBill);
router.put('/:id/status', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), updateOrderStatus);
router.put('/bulk-status', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), bulkUpdateOrderStatus);
router.put('/:id/confirm-payment', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), confirmOrderPayment);

export default router;

