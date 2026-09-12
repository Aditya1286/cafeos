import { Router } from 'express';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct, deleteProduct
} from '../controllers/menuController';
import { protect } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceTenant);

// Category Routes
router.get('/categories', getCategories);
router.post('/categories', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), createCategory);
router.put('/categories/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), updateCategory);
router.delete('/categories/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), deleteCategory);

// Product Routes
router.get('/products', getProducts);
router.post('/products', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), createProduct);
router.put('/products/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), updateProduct);
router.delete('/products/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), deleteProduct);

export default router;
