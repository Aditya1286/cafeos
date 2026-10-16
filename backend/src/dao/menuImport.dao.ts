import mongoose from 'mongoose';
import { Category, ICategory } from '../models/Category';
import { Product, IProduct, IProductAddon, IProductVariant } from '../models/Product';

// Pure data-access layer for the AI menu import — no validation or business rules here,
// that lives in ../services/menuImport.service.ts.

type Id = mongoose.Types.ObjectId | string;

export interface NewCategoryRow {
  businessId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  displayOrder: number;
}

export interface NewProductRow {
  _id: mongoose.Types.ObjectId; // assigned up front so a failed import can remove exactly its own rows
  businessId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
  isVeg: boolean;
  displayOrder: number;
  variants: IProductVariant[];
  addons: IProductAddon[];
}

export const listCategoriesForBusiness = (businessId: Id): Promise<ICategory[]> =>
  Category.find({ businessId }).sort({ displayOrder: 1 });

/** Names of the products already in these categories (deleted ones excluded — they're gone for the owner). */
export const listProductNamesInCategories = (
  businessId: Id,
  categoryIds: Id[]
): Promise<Pick<IProduct, 'categoryId' | 'name'>[]> =>
  Product.find({ businessId, categoryId: { $in: categoryIds }, isDeleted: { $ne: true } })
    .select({ categoryId: 1, name: 1 })
    .lean();

export const maxProductDisplayOrder = async (businessId: Id): Promise<number> => {
  const top = await Product.findOne({ businessId }).sort({ displayOrder: -1 }).select({ displayOrder: 1 }).lean();
  return top?.displayOrder ?? -1;
};

export const insertCategories = (rows: NewCategoryRow[]): Promise<ICategory[]> =>
  rows.length ? Category.insertMany(rows) : Promise.resolve([]);

export const insertProducts = (rows: NewProductRow[]): Promise<IProduct[]> =>
  rows.length ? Product.insertMany(rows) : Promise.resolve([]);

export const deleteCategoriesByIds = (businessId: Id, ids: Id[]) =>
  Category.deleteMany({ businessId, _id: { $in: ids } });

export const deleteProductsByIds = (businessId: Id, ids: Id[]) =>
  Product.deleteMany({ businessId, _id: { $in: ids } });
