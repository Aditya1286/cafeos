import { Router } from 'express';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct, deleteProduct,
  uploadMenuImage
} from '../controllers/menuController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

// Category Routes
router.get('/categories', getCategories);
router.post('/categories', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), createCategory);
router.put('/categories/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), updateCategory);
router.delete('/categories/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), deleteCategory);

// Image upload (category or product photo)
router.post('/upload-image', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), uploadMenuImage);

// Product Routes
router.get('/products', getProducts);
router.post('/products', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), createProduct);
router.put('/products/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), updateProduct);
router.delete('/products/:id', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), deleteProduct);

export default router;
