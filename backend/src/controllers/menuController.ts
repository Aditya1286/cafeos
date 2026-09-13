import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { MenuImage } from '../models/MenuImage';
import { Request } from 'express';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

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

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Product name is required.' } });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please select a category for this product.' } });
    }
    if (pricePaise === undefined || pricePaise === null || isNaN(Number(pricePaise)) || Number(pricePaise) < 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid price is required.' } });
    }

    const category = await Category.findOne({ _id: categoryId, businessId: req.businessId });
    if (!category) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Selected category does not exist for this business.' } });
    }

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

// Owner/Staff: Upload a menu image (category or product photo). No cloud
// storage yet — the bytes are decoded from a base64 data URL and saved
// straight into MongoDB; the returned imageUrl points at getMenuImage below.
export const uploadMenuImage = async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'An image is required.' } });
    }

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE', message: 'Image must be a JPEG, PNG, or WEBP file.' } });
    }

    const [, contentType, base64Data] = match;
    const data = Buffer.from(base64Data, 'base64');
    if (data.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({ success: false, error: { code: 'IMAGE_TOO_LARGE', message: 'Image must be under 5MB.' } });
    }

    const menuImage = await MenuImage.create({ businessId: req.businessId, contentType, data });

    return res.status(201).json({
      success: true,
      data: { imageUrl: `/api/v1/public/images/${menuImage._id}` },
      message: 'Image uploaded'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Public: Serve a stored menu image by id. Public because <img> tags can't
// carry an Authorization header — the id itself is an unguessable ObjectId.
export const getMenuImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const image = await MenuImage.findById(id);
    if (!image) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
    }
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(image.data);
  } catch (error: any) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } });
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
