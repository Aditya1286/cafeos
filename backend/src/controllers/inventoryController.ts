import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { InventoryItem } from '../models/InventoryItem';
import { Recipe } from '../models/Recipe';
import { InventoryTransaction } from '../models/InventoryTransaction';

export const getInventoryItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await InventoryItem.find({ businessId: req.businessId }).sort({ name: 1 });
    return res.json({ success: true, data: items });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { name, unit, currentStock, minimumStockLevel, costPerUnitPaise, supplierName, supplierContact } = req.body;
    
    const status = currentStock <= 0 ? 'OUT_OF_STOCK' : currentStock <= (minimumStockLevel || 5) ? 'LOW_STOCK' : 'IN_STOCK';

    const item = await InventoryItem.create({
      businessId: req.businessId,
      name,
      unit,
      currentStock: currentStock || 0,
      minimumStockLevel: minimumStockLevel || 5,
      costPerUnitPaise: costPerUnitPaise || 0,
      supplierName: supplierName || '',
      supplierContact: supplierContact || '',
      status
    });

    if (currentStock > 0) {
      await InventoryTransaction.create({
        businessId: req.businessId,
        inventoryItemId: item._id,
        type: 'PURCHASE',
        quantityChanged: currentStock,
        balanceAfter: currentStock,
        reason: 'Initial Stock Entry'
      });
    }

    return res.status(201).json({ success: true, data: item, message: 'Inventory item created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, quantityChanged, reason } = req.body; // type: 'PURCHASE' | 'WASTAGE' | 'ADJUSTMENT'

    const item = await InventoryItem.findOne({ _id: id, businessId: req.businessId });
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });

    const newStock = Math.max(0, item.currentStock + quantityChanged);
    item.currentStock = newStock;
    item.status = newStock === 0 ? 'OUT_OF_STOCK' : newStock <= item.minimumStockLevel ? 'LOW_STOCK' : 'IN_STOCK';
    await item.save();

    const transaction = await InventoryTransaction.create({
      businessId: req.businessId,
      inventoryItemId: item._id,
      type: type || 'ADJUSTMENT',
      quantityChanged,
      balanceAfter: newStock,
      reason: reason || 'Manual adjustment'
    });

    return res.json({ success: true, data: { item, transaction }, message: 'Stock adjusted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Recipe BOM
export const getRecipes = async (req: AuthRequest, res: Response) => {
  try {
    const recipes = await Recipe.find({ businessId: req.businessId })
      .populate('productId')
      .populate('ingredients.inventoryItemId');
    return res.json({ success: true, data: recipes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const upsertRecipe = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, ingredients } = req.body; // ingredients: [{ inventoryItemId, quantityRequired }]

    const recipe = await Recipe.findOneAndUpdate(
      { businessId: req.businessId, productId },
      { businessId: req.businessId, productId, ingredients },
      { new: true, upsert: true }
    );

    return res.json({ success: true, data: recipe, message: 'Recipe BOM updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
