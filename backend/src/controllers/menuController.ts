import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Request } from 'express';

// Public: Get menu by business slug
export const getPublicMenu = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    
    const categories = await Category.find({ businessId, isAvailable: true }).sort({ displayOrder: 1 });
    const products = await Product.find({ businessId, isAvailable: true }).sort({ displayOrder: 1 });

    return res.json({
      success: true,
      data: {
        categories,
        products
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// Owner/Staff: Categories
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Category.find({ businessId: req.businessId }).sort({ displayOrder: 1 });
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, displayOrder } = req.body;
    const category = await Category.create({
      businessId: req.businessId,
      name,
      description: description || '',
      displayOrder: displayOrder || 0
    });
    return res.status(201).json({ success: true, data: category, message: 'Category created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      req.body,
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return res.json({ success: true, data: category, message: 'Category updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await Category.findOneAndDelete({ _id: id, businessId: req.businessId });
    await Product.deleteMany({ categoryId: id, businessId: req.businessId });
    return res.json({ success: true, message: 'Category and associated products deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Products
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({ businessId: req.businessId }).populate('categoryId').sort({ displayOrder: 1 });
    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, description, pricePaise, imageUrl, isVeg, preparationTimeMinutes, variants, addons } = req.body;
    const product = await Product.create({
      businessId: req.businessId,
      categoryId,
      name,
      description: description || '',
      pricePaise,
      imageUrl: imageUrl || '',
      isVeg: isVeg !== undefined ? isVeg : true,
      preparationTimeMinutes: preparationTimeMinutes || 15,
      variants: variants || [],
      addons: addons || []
    });
    return res.status(201).json({ success: true, data: product, message: 'Product created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return res.json({ success: true, data: product, message: 'Product updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await Product.findOneAndDelete({ _id: id, businessId: req.businessId });
    return res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
