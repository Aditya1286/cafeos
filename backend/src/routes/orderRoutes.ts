import { Router } from 'express';
import {
  getOrders, getOrderById, searchOrders, updateOrderStatus, bulkUpdateOrderStatus, confirmOrderPayment, getOrderBill,
  getRefundOrders, getRefundInsights
} from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.get('/', getOrders);
router.get('/search', searchOrders);
// Must be registered before the /:id catch-all below, or Express would match
// "refunds" itself as an :id and this route would never be reached.
router.get('/refunds', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getRefundOrders);
router.get('/refunds/insights', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getRefundInsights);
router.get('/:id', getOrderById);
router.get('/:id/bill', getOrderBill);
router.put('/:id/status', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), updateOrderStatus);
router.put('/bulk-status', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), bulkUpdateOrderStatus);
router.put('/:id/confirm-payment', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'), confirmOrderPayment);

export default router;

