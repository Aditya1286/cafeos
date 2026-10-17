import { useState } from 'react';
import { Plus, Minus, UtensilsCrossed } from 'lucide-react';
import VegMark from '@/atoms/VegMark';
import { formatCurrency } from '@/utils/money';

interface MenuItemCardProps {
  product: any;
  quantity: number;
  isPopular: boolean;
  /** The owner's House special mark (only passed as true when café identity is on). */
  isHouseSpecial?: boolean;
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
  isHouseSpecial = false,
  onAdd,
  onRemove,
}: MenuItemCardProps) => {
  // A dead image URL would otherwise show the browser's broken-image + alt text across half
  // the screen width — fall back to the same tile as "no photo".
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = !!product.imageUrl && !imageFailed;

  return (
    <div className="flex flex-col min-w-0">
      <div className="relative aspect-square rounded-cafe-image overflow-hidden bg-cafe-raised border border-cafe-line/70 shadow-cafe-card">
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 [background:var(--cafe-dish-fallback)] text-cafe-accent-300">
            <UtensilsCrossed className="w-8 h-8" />
            <span className="text-2xl font-black text-cafe-accent-400/80">
              {product.name?.charAt(0)}
            </span>
          </div>
        )}

        {(isHouseSpecial || isPopular) && (
          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
            {isHouseSpecial && (
              <span className="px-2.5 py-1 rounded-cafe-chip bg-cafe-badge-special-bg text-[11px] font-extrabold text-cafe-badge-special-fg shadow-sm">
                House special
              </span>
            )}
            {isPopular && (
              <span className="px-2.5 py-1 rounded-cafe-chip bg-cafe-badge-popular-bg/95 backdrop-blur text-[11px] font-extrabold text-cafe-badge-popular-fg shadow-sm">
                Popular
              </span>
            )}
          </div>
        )}

        <div className="absolute bottom-2.5 right-2.5">
          {quantity > 0 ? (
            <div className="flex items-center rounded-full bg-cafe-button text-cafe-on-accent shadow-lg shadow-cafe-button/30 font-black text-sm">
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
              className="w-11 h-11 rounded-full bg-cafe-surface border-2 border-cafe-accent-400 text-cafe-accent-500 shadow-lg flex items-center justify-center active:scale-90 transition-transform"
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
          <h3 className="text-[13px] font-bold font-cafe-display text-cafe-ink leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>
        <div className="text-sm font-black text-cafe-ink">{formatCurrency(product.pricePaise)}</div>
      </div>
    </div>
  );
};

export default MenuItemCard;
