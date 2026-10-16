import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, createProduct, updateProduct, deleteProduct, archiveProduct,
  uploadMenuImage
} from '../controllers/menuController';
import { extractMenuImport, commitMenuImport } from '../controllers/menuImportController';
import { AuthRequest } from '../middleware/auth';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';
import { runtime } from '../config';

const router = Router();

// Every menu read is a paid AI call — capped per café (not per IP: staff share one café's quota).
const menuImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: runtime.nodeEnv === 'production' ? 15 : 1000,
  keyGenerator: (req) => (req as AuthRequest).businessId?.toString() || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many menu uploads this hour. Please try again later.' }
  }
});

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
router.put('/products/:id/archive', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), archiveProduct);

// Upload Menu (AI import): read photos into a draft, then save the reviewed draft
router.post('/import/extract', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), menuImportLimiter, extractMenuImport);
router.post('/import/commit', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), commitMenuImport);

export default router;
