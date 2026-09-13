import { Router } from 'express';
import {
  getInventoryItems, createInventoryItem, adjustStock,
  getRecipes, upsertRecipe
} from '../controllers/inventoryController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.get('/items', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'INVENTORY_MANAGER'), getInventoryItems);
router.post('/items', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'INVENTORY_MANAGER'), createInventoryItem);
router.put('/items/:id/adjust', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'INVENTORY_MANAGER'), adjustStock);

router.get('/recipes', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'INVENTORY_MANAGER'), getRecipes);
router.post('/recipes', restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER', 'INVENTORY_MANAGER'), upsertRecipe);

export default router;
