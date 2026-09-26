import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { uploadImage, readMongoFile } from '../services/storage';
import { handleServiceError } from '../utils/serviceError';
import { Request } from 'express';
import mongoose from 'mongoose';
import { getPopularProductIds } from '../services/menuPopularity.service';


// The only fields an owner/manager may change on an update. Anything else in the body —
// businessId (which would move the record into another café's menu), isDeleted, _id, or a
// Mongo operator like $unset — is dropped rather than passed straight to the database.
const EDITABLE_CATEGORY_FIELDS = ['name', 'description', 'displayOrder', 'isAvailable'] as const;
const EDITABLE_PRODUCT_FIELDS = [
  'name', 'categoryId', 'description', 'pricePaise', 'imageUrl', 'isVeg',
  'preparationTimeMinutes', 'displayOrder', 'variants', 'addons', 'isAvailable'
] as const;

const pickFields = (body: any, fields: readonly string[]): Record<string, unknown> => {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) picked[field] = body[field];
  }
  return picked;
};

// Public: Get menu by business slug
export const getPublicMenu = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    // A malformed id would otherwise throw a CastError out of the queries below and 500.
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(404).json({ success: false, error: { code: 'BUSINESS_NOT_FOUND', message: 'Menu not found' } });
    }

    const categories = await Category.find({ businessId, isAvailable: true }).sort({ displayOrder: 1 });
    // isDeleted excluded defensively too — it's already unorderable via isAvailable:false,
    // but a deleted item should never resurface here even if isAvailable were ever restored
    // without also clearing isDeleted.
    const products = await Product.find({ businessId, isAvailable: true, isDeleted: { $ne: true } }).sort({ displayOrder: 1 });
    // Best sellers for the menu's "Popular" tags — a nice-to-have, so a failure here must never
    // take the whole menu down with it.
    const popularProductIds = await getPopularProductIds(businessId).catch((err) => {
      console.error('[menu] Popular items lookup failed:', err);
      return [] as string[];
    });

    return res.json({
      success: true,
      data: {
        categories,
        products,
        popularProductIds
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
      { $set: pickFields(req.body, EDITABLE_CATEGORY_FIELDS) },
      { new: true, runValidators: true }
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
    // isDeleted excluded here — that's the whole point of "delete" vs "remove from menu"
    // (isAvailable:false): a removed item still shows up for the owner to restore, a
    // deleted one disappears from this list entirely while the document is kept intact.
    const products = await Product.find({ businessId: req.businessId, isDeleted: { $ne: true } })
      .populate('categoryId')
      .sort({ displayOrder: 1 });
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
    const { name, categoryId, pricePaise } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Product name cannot be empty.' } });
    }
    if (pricePaise !== undefined && (isNaN(Number(pricePaise)) || Number(pricePaise) < 0)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid price is required.' } });
    }
    if (categoryId !== undefined) {
      const category = await Category.findOne({ _id: categoryId, businessId: req.businessId });
      if (!category) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Selected category does not exist for this business.' } });
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      { $set: pickFields(req.body, EDITABLE_PRODUCT_FIELDS) },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return res.json({ success: true, data: product, message: 'Product updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Manager: Upload a menu image (category or product photo). Validation and where the
// bytes end up (MongoDB or S3, per config.storageDriver) live in services/storage.
export const uploadMenuImage = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = await uploadImage({ dataUrl: req.body.image, folder: 'menu', ownerId: req.businessId?.toString() });
    return res.status(201).json({ success: true, data: { imageUrl: url }, message: 'Image uploaded' });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// Public: Serve an image stored by the 'mongo' storage driver. Public because <img> tags can't
// carry an Authorization header — the id itself is an unguessable ObjectId. (S3-stored images
// are served by S3/the CDN directly and never come through here.)
export const getMenuImage = async (req: Request, res: Response) => {
  try {
    const image = await readMongoFile(req.params.id);
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

// "Remove from menu" never hard-deletes the Product row — past orders keep a frozen
// name/price snapshot but still reference this productId (Order.items[].productId), so
// deleting the doc would leave historical orders pointing at nothing, with no way to
// bring the item back without recreating it under a new id. Soft-remove via isAvailable
// instead: it disappears from the public menu (getPublicMenu filters isAvailable:true)
// and can no longer be ordered (createOrder rejects !product.isAvailable), but the owner
// can still see and restore it from their own product list.
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      { isAvailable: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return res.json({ success: true, data: product, message: 'Item removed from menu' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// "Delete" — distinct from "Remove from menu" above. Also never hard-deletes the row
// (same reasoning: Order.items[].productId would dangle), but goes further: the item
// disappears from the owner's own product list too, not just the public menu. There's
// no restore button for this in the UI — the data is only ever recovered by clearing
// isDeleted directly, which is intentional (this is the "actually gone" action; use
// "Remove from menu" instead for anything that might come back later).
export const archiveProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findOneAndUpdate(
      { _id: id, businessId: req.businessId },
      { isDeleted: true, isAvailable: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return res.json({ success: true, data: product, message: 'Item deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
