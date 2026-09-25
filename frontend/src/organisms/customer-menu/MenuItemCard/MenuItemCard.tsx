import { useState } from 'react';
import { Plus, Minus, UtensilsCrossed } from 'lucide-react';
import VegMark from '@/atoms/VegMark';
import { formatCurrency } from '@/utils/money';

interface MenuItemCardProps {
  product: any;
  quantity: number;
  isPopular: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

/**
 * Photo-first menu tile (toing-style): a large square photo carries the item, with the add
 * control floating on its corner so the customer can order without leaving the grid; name
 * and price sit underneath. Laid out two-up by MenuSection.
 */
export const MenuItemCard = ({
  product,
  quantity,
  isPopular,
  onAdd,
  onRemove,
}: MenuItemCardProps) => {
  // A dead image URL would otherwise show the browser's broken-image + alt text across half
  // the screen width — fall back to the same tile as "no photo".
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = !!product.imageUrl && !imageFailed;

  return (
    <div className="flex flex-col min-w-0">
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/70 shadow-sm">
        {showPhoto ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          // No photo: a neutral tile, never a stock photo of some other dish.
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-orange-50 to-amber-100 text-orange-300">
            <UtensilsCrossed className="w-8 h-8" />
            <span className="text-2xl font-black text-orange-400/80">
              {product.name?.charAt(0)}
            </span>
          </div>
        )}

        {isPopular && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[11px] font-extrabold text-emerald-700 shadow-sm">
            Popular
          </span>
        )}

        <div className="absolute bottom-2.5 right-2.5">
          {quantity > 0 ? (
            <div className="flex items-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 font-black text-sm">
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove one ${product.name}`}
                className="w-9 h-10 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="min-w-[1.25rem] text-center tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                aria-label={`Add another ${product.name}`}
                className="w-9 h-10 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              aria-label={`Add ${product.name}`}
              className="w-11 h-11 rounded-full bg-white border-2 border-orange-400 text-orange-500 shadow-lg flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      <div className="pt-2.5 px-0.5 space-y-1">
        <div className="flex items-start gap-1.5">
          <span className="mt-[3px]">
            <VegMark isVeg={product.isVeg} size="sm" />
          </span>
          <h3 className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>
        <div className="text-sm font-black text-slate-900">
          {formatCurrency(product.pricePaise)}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
