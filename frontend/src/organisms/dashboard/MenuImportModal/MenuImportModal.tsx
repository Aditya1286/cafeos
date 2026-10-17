import React, { useRef } from 'react';
import { AlertTriangle, Camera, ImagePlus, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import VegMark from '@/atoms/VegMark';
import { formatCurrency } from '@/utils/money';
import { itemNeedsPrice, warningLabels, EditableMenuItem } from '@/utils/menuImportDraft';
import { MAX_MENU_PHOTOS, MenuImportState } from '@/hooks/useMenuImport';

interface MenuImportModalProps {
  open: boolean;
  importer: MenuImportState;
  onClose: () => void;
  onSave: () => void;
}

// 16px on phones: smaller inputs make iOS Safari zoom the page on focus.
const fieldCls =
  'min-w-0 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all';

/**
 * "Upload Menu": photos of a printed menu → AI-read draft → owner checks and edits → saved to
 * the menu. Nothing reaches customers until the owner presses the final button.
 */
export const MenuImportModal = ({ open, importer, onClose, onSave }: MenuImportModalProps) => {
  if (!open) return null;
  const { step } = importer;

  return (
    <Modal
      title="Upload Menu"
      onClose={step === 'saving' ? () => {} : onClose}
      maxWidth={step === 'review' || step === 'saving' ? 'max-w-2xl' : 'max-w-md'}
    >
      {step === 'pick' && <PickPhotos importer={importer} />}
      {step === 'reading' && <Reading photoCount={importer.photos.length} />}
      {(step === 'review' || step === 'saving') && <Review importer={importer} onSave={onSave} />}
    </Modal>
  );
};

// ── Step 1: photos ───────────────────────────────────────────────────────────

const PickPhotos = ({ importer }: { importer: MenuImportState }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { photos, preparingPhotos, error } = importer;
  const canAddMore = photos.length < MAX_MENU_PHOTOS;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) importer.addFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 leading-relaxed">
        Take a photo of each page of your printed menu. We&apos;ll read the sections, dishes and
        prices for you — you check everything before it goes live. Photos aren&apos;t added to
        dishes.
      </p>

      {error && (
        <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={preparingPhotos}
          className="w-full flex flex-col items-center gap-2 py-10 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40 text-slate-600 transition-all disabled:opacity-60"
        >
          {preparingPhotos ? (
            <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
          ) : (
            <Camera className="w-7 h-7 text-brand-500" />
          )}
          <span className="text-sm font-extrabold text-slate-800">Take or choose photos</span>
          <span className="text-[11px] font-medium text-slate-500">
            Up to {MAX_MENU_PHOTOS} pages · JPEG, PNG or WEBP
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div
              key={photo.key}
              className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
            >
              <img
                src={photo.dataUrl}
                alt={`Menu page ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <span className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/75 text-[10px] font-extrabold text-white">
                Page {index + 1}
              </span>
              <button
                type="button"
                onClick={() => importer.removePhoto(photo.key)}
                aria-label={`Remove page ${index + 1}`}
                className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-600 flex items-center justify-center shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {canAddMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={preparingPhotos}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-400 flex flex-col items-center justify-center gap-1 text-slate-500 transition-all disabled:opacity-60"
            >
              {preparingPhotos ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
              <span className="text-[11px] font-bold">Add page</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <ul className="text-[11px] text-slate-500 font-medium space-y-0.5 list-disc pl-4">
        <li>One photo per page, taken straight on, in good light.</li>
        <li>Keep prices in the frame — a cut-off price can&apos;t be read.</li>
      </ul>

      <button
        type="button"
        onClick={importer.readMenu}
        disabled={photos.length === 0 || preparingPhotos}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {photos.length > 1 ? `Read menu (${photos.length} pages)` : 'Read menu'}
      </button>
    </div>
  );
};

// ── Step 2: waiting for the AI ───────────────────────────────────────────────

const Reading = ({ photoCount }: { photoCount: number }) => (
  <div
    className="py-10 flex flex-col items-center text-center gap-3"
    role="status"
    aria-live="polite"
  >
    <Loader2 className="w-9 h-9 animate-spin text-brand-500" />
    <p className="text-sm font-extrabold text-slate-900">Reading your menu…</p>
    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
      Finding sections, dishes and prices on {photoCount > 1 ? `${photoCount} pages` : 'your photo'}
      . This usually takes under a minute — keep this window open.
    </p>
  </div>
);

// ── Step 3: review & edit ────────────────────────────────────────────────────

const Review = ({ importer, onSave }: { importer: MenuImportState; onSave: () => void }) => {
  const { categories, notes, itemCount, problems, step } = importer;
  const saving = step === 'saving';
  const blocked = itemCount === 0 || problems.missingPrice > 0 || problems.missingName > 0;

  const hint =
    problems.missingPrice > 0
      ? `${problems.missingPrice} item${problems.missingPrice === 1 ? '' : 's'} need${problems.missingPrice === 1 ? 's' : ''} a price`
      : problems.missingName > 0
        ? 'Every section and item needs a name'
        : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 leading-relaxed">
        Found <strong className="text-slate-900">{itemCount} items</strong> in{' '}
        <strong className="text-slate-900">{categories.length} sections</strong>. Check the names
        and prices — nothing is on your menu until you save. Items marked in amber need a look.
      </p>

      {notes.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800 space-y-0.5">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-slate-500">
          Nothing left to import.
        </p>
      ) : (
        <div className="space-y-5 max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {categories.map((category) => (
            <section key={category.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={category.name}
                  onChange={(e) => importer.renameCategory(category.key, e.target.value)}
                  aria-label="Section name"
                  placeholder="Section name"
                  className={`${fieldCls} flex-1 font-extrabold ${!category.name.trim() ? 'border-rose-300' : ''}`}
                />
                <span className="text-[11px] font-bold text-slate-400 shrink-0">
                  {category.items.length}
                </span>
                <button
                  type="button"
                  onClick={() => importer.removeCategory(category.key)}
                  aria-label={`Remove section ${category.name}`}
                  title="Remove section"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-1.5">
                {category.items.map((item) => (
                  <ReviewItemRow
                    key={item.key}
                    item={item}
                    onChange={(patch) => importer.updateItem(category.key, item.key, patch)}
                    onRemove={() => importer.removeItem(category.key, item.key)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 space-y-2">
        {hint && <p className="text-[11px] font-bold text-rose-600 text-center">{hint}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={importer.startOver}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Photos
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={blocked || saving}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              `Add ${itemCount} item${itemCount === 1 ? '' : 's'} to menu`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReviewItemRowProps {
  item: EditableMenuItem;
  onChange: (patch: Partial<EditableMenuItem>) => void;
  onRemove: () => void;
}

const ReviewItemRow = ({ item, onChange, onRemove }: ReviewItemRowProps) => {
  const needsPrice = itemNeedsPrice(item);
  const labels = warningLabels(item);
  const tone =
    needsPrice || !item.name.trim()
      ? 'border-rose-300 bg-rose-50/40'
      : labels.length
        ? 'border-amber-300 bg-amber-50/40'
        : 'border-slate-200 bg-white';

  return (
    <li className={`p-2 rounded-xl border ${tone}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ isVeg: !item.isVeg })}
          aria-label={item.isVeg ? 'Veg — tap to mark non-veg' : 'Non-veg — tap to mark veg'}
          title={item.isVeg ? 'Veg (tap to change)' : 'Non-veg (tap to change)'}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 shrink-0"
        >
          <VegMark isVeg={item.isVeg} />
        </button>
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-label="Item name"
          placeholder="Item name"
          className={`${fieldCls} flex-1 font-bold`}
        />
        {item.variants.length === 0 ? (
          <div className="relative w-24 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              ₹
            </span>
            <input
              value={item.priceInput}
              onChange={(e) => onChange({ priceInput: e.target.value })}
              inputMode="decimal"
              aria-label={`Price of ${item.name || 'item'}`}
              placeholder="Price"
              className={`${fieldCls} w-full pl-6 font-bold ${needsPrice ? 'border-rose-300' : ''}`}
            />
          </div>
        ) : (
          <span className="w-24 shrink-0 text-right text-xs font-black text-slate-700">
            from {formatCurrency(Math.min(...item.variants.map((v) => v.pricePaise)))}
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name || 'item'}`}
          title="Remove"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {(item.description ||
        item.variants.length > 0 ||
        item.addons.length > 0 ||
        labels.length > 0) && (
        <div className="mt-1.5 pl-10 flex flex-wrap items-center gap-1.5">
          {labels.map((label) => (
            <span
              key={label}
              className="px-1.5 py-0.5 rounded-md bg-amber-100 text-[10px] font-extrabold text-amber-800"
            >
              {label}
            </span>
          ))}
          {item.variants.map((v) => (
            <span
              key={`v-${v.name}`}
              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600"
            >
              {v.name} {formatCurrency(v.pricePaise)}
            </span>
          ))}
          {item.addons.map((a) => (
            <span
              key={`a-${a.name}`}
              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500"
            >
              + {a.name} {formatCurrency(a.pricePaise)}
            </span>
          ))}
          {item.description && (
            <span className="w-full text-[11px] text-slate-500 line-clamp-1">
              {item.description}
            </span>
          )}
        </div>
      )}
    </li>
  );
};

export default MenuImportModal;
