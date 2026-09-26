import { useMemo, useState } from 'react';
import { Plus, EyeOff, RotateCcw, Pencil, Trash2, Search, UtensilsCrossed, X } from 'lucide-react';
import { formatCurrency } from '@/utils/money';
import VegMark from '@/atoms/VegMark';
import EmptyState from '@/atoms/EmptyState';

interface DigitalMenuPanelProps {
  products: any[];
  categories: any[];
  onAddItem: () => void;
  onEditItem: (product: any) => void;
  onRemoveItem: (productId: string) => void;
  onRestoreItem: (productId: string) => void;
  onDeleteItem: (product: any) => void;
}

const ALL = 'ALL';
const UNCATEGORIZED = 'UNCATEGORIZED';

const categoryIdOf = (p: any): string =>
  (typeof p.categoryId === 'string' ? p.categoryId : p.categoryId?._id) || UNCATEGORIZED;

/**
 * Owner's menu manager, built to be usable from a phone: compact rows (many items per screen
 * instead of one tall card each), grouped under category headings, with a search box and
 * category chips to get to any item in a tap or two.
 */
export const DigitalMenuPanel = ({
  products,
  categories,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onRestoreItem,
  onDeleteItem,
}: DigitalMenuPanelProps) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL);

  // Categories in the owner's order, plus a catch-all for items whose category is gone.
  const groups = useMemo(() => {
    const known = new Set(categories.map((c) => c._id));
    const list = categories.map((c) => ({ id: c._id as string, name: c.name as string }));
    if (products.some((p) => !known.has(categoryIdOf(p))))
      list.push({ id: UNCATEGORIZED, name: 'Uncategorized' });
    return list.map((g) => ({
      ...g,
      items: products.filter(
        (p) => (known.has(categoryIdOf(p)) ? categoryIdOf(p) : UNCATEGORIZED) === g.id,
      ),
    }));
  }, [products, categories]);

  // Search matches an item's name/description, or its category's name (then the whole category shows).
  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => activeCategory === ALL || g.id === activeCategory)
      .map((g) => ({
        ...g,
        items:
          !q || g.name.toLowerCase().includes(q)
            ? g.items
            : g.items.filter(
                (p) =>
                  p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
              ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, activeCategory, query]);

  const hiddenCount = products.filter((p) => p.isAvailable === false).length;
  const summary = [
    `${products.length} item${products.length === 1 ? '' : 's'}`,
    hiddenCount > 0 && `${hiddenCount} hidden`,
    `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-900">Your Menu</h2>
          <p className="text-xs text-slate-500 font-medium">{summary}</p>
        </div>
        <button
          onClick={onAddItem}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-6 h-6" />}
          title="Your menu is empty"
          description="Add your first dish — customers see it as soon as you save."
          actionLabel="Add Menu Item"
          onAction={onAddItem}
        />
      ) : (
        <>
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items or categories"
                // 16px on phones: smaller inputs make iOS Safari zoom the page on focus.
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category chips: one swipeable row on phones, wrapping on wider screens. */}
            <div className="flex gap-2 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: ALL, name: 'All', count: products.length },
                ...groups.map((g) => ({ id: g.id, name: g.name, count: g.items.length })),
              ].map((chip) => {
                const active = activeCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={(e) => {
                      setActiveCategory(chip.id);
                      // Keep the picked chip visible in the swipeable row.
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center',
                      });
                    }}
                    aria-pressed={active}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {chip.name} <span className="text-slate-400">{chip.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {visibleGroups.length === 0 ? (
            <p className="py-10 text-center text-sm font-medium text-slate-500">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <div className="space-y-5">
              {visibleGroups.map((group) => (
                <section key={group.id}>
                  <h3 className="px-1 mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    {group.name} <span className="text-slate-400">· {group.items.length}</span>
                  </h3>
                  <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {group.items.map((p) => (
                      <MenuManageRow
                        key={p._id}
                        product={p}
                        onEdit={() => onEditItem(p)}
                        onToggle={() =>
                          p.isAvailable === false ? onRestoreItem(p._id) : onRemoveItem(p._id)
                        }
                        onDelete={() => onDeleteItem(p)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface MenuManageRowProps {
  product: any;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

/** One compact item row: tap it to edit; hide/show and delete sit on the right. */
const MenuManageRow = ({ product: p, onEdit, onToggle, onDelete }: MenuManageRowProps) => {
  const hidden = p.isAvailable === false;
  const [imageFailed, setImageFailed] = useState(false);
  const iconBtn = 'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0';

  return (
    <li className="flex items-center gap-2 p-2 pr-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div
          className={`w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 ${hidden ? 'opacity-50' : ''}`}
        >
          {p.imageUrl && !imageFailed ? (
            <img
              src={p.imageUrl}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className={`w-full h-full object-cover ${hidden ? 'grayscale' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <span className="mt-1">
              <VegMark isVeg={p.isVeg !== false} size="sm" />
            </span>
            <span
              className={`line-clamp-2 text-sm font-bold leading-snug ${hidden ? 'text-slate-400' : 'text-slate-900'}`}
            >
              {p.name}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`text-sm font-black ${hidden ? 'text-slate-400' : 'text-slate-900'}`}>
              {formatCurrency(p.pricePaise)}
            </span>
            {hidden && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                Hidden
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${p.name}`}
        title="Edit"
        className={`${iconBtn} text-slate-500 hover:bg-slate-100`}
      >
        <Pencil className="w-4 h-4" />
      </button>
      {hidden ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Show ${p.name} on the menu again`}
          title="Show on menu"
          className={`${iconBtn} text-emerald-600 hover:bg-emerald-50`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Hide ${p.name} from the menu`}
          title="Hide from menu"
          className={`${iconBtn} text-slate-500 hover:bg-slate-100`}
        >
          <EyeOff className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${p.name}`}
        title="Delete"
        className={`${iconBtn} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
};

export default DigitalMenuPanel;
