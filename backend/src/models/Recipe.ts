import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipeIngredient {
  inventoryItemId: mongoose.Types.ObjectId;
  quantityRequired: number; // e.g., 0.1 for 100g Cheese if unit is KG
}

export interface IRecipe extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  ingredients: IRecipeIngredient[];
  createdAt: Date;
  updatedAt: Date;
}

const RecipeSchema = new Schema<IRecipe>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    ingredients: [
      {
        inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantityRequired: { type: Number, required: true, min: 0.001 }
      }
    ]
  },
  { timestamps: true }
);

RecipeSchema.index({ businessId: 1, productId: 1 });

export const Recipe = mongoose.model<IRecipe>('Recipe', RecipeSchema);
