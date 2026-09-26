import React, { useRef } from 'react';
import { ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import { FormField, inputCls } from '@/molecules/FormField';

interface AddProductModalProps {
  open: boolean;
  isEditing?: boolean;
  onClose: () => void;
  categories: any[];
  name: string;
  setName: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  pricePaise: number;
  setPricePaise: (v: number) => void;
  description: string;
  setDescription: (v: string) => void;
  isVeg: boolean;
  setIsVeg: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;

  // Inline "add a new category" without leaving this form
  showAddCategory: boolean;
  setShowAddCategory: (v: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  creatingCategory: boolean;
  onCreateCategory: () => void;

  // Photo upload — posted to the backend and stored as soon as a file is picked
  imagePreviewUrl: string;
  uploadingImage: boolean;
  onSelectImage: (file: File) => void;
}

export const AddProductModal = ({
  open,
  isEditing,
  onClose,
  categories,
  name,
  setName,
  categoryId,
  setCategoryId,
  pricePaise,
  setPricePaise,
  description,
  setDescription,
  isVeg,
  setIsVeg,
  onSubmit,
  showAddCategory,
  setShowAddCategory,
  newCategoryName,
  setNewCategoryName,
  creatingCategory,
  onCreateCategory,
  imagePreviewUrl,
  uploadingImage,
  onSelectImage,
}: AddProductModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelectImage(file);
    e.target.value = '';
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCreateCategory();
    }
  };

  return (
    <Modal title={isEditing ? 'Edit Menu Item' : 'Add Menu Item'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Photo (optional)">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                <>{imagePreviewUrl ? 'Change photo' : 'Upload photo'}</>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </FormField>

        <FormField label="Item Name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cappuccino"
            className={inputCls}
          />
        </FormField>

        <FormField label="Category">
          <div className="flex items-center justify-between mb-1">
            {!showAddCategory && (
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New category
              </button>
            )}
          </div>

          {showAddCategory ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleCategoryKeyDown}
                placeholder="e.g. Cold Beverages"
                className={inputCls}
              />
              <button
                type="button"
                onClick={onCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black disabled:opacity-40 transition-all shrink-0"
              >
                {creatingCategory ? '...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {categories.length === 0 && !showAddCategory && (
            <p className="text-[11px] font-semibold text-rose-600 pt-1">
              No categories yet — add one above before adding items.
            </p>
          )}
        </FormField>

        <FormField label="Price (₹)">
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={pricePaise / 100}
            onChange={(e) => setPricePaise(Math.round(Number(e.target.value) * 100))}
            className={inputCls}
          />
        </FormField>

        <FormField label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </FormField>

        <FormField label="Type">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsVeg(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${isVeg ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              🟢 Veg
            </button>
            <button
              type="button"
              onClick={() => setIsVeg(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${!isVeg ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              🔴 Non-Veg
            </button>
          </div>
        </FormField>

        <button
          type="submit"
          disabled={categories.length === 0 || uploadingImage}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-orange-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEditing ? 'Save Changes' : 'Add to Menu'}
        </button>
      </form>
    </Modal>
  );
};

export default AddProductModal;
