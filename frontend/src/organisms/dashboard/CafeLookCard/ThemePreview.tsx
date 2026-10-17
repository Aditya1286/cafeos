import { UtensilsCrossed } from 'lucide-react';
import { CafeThemeScope } from '@/themes';
import type { PublicIdentity } from '@/themes';
import { formatCurrency } from '@/utils/money';

interface ThemePreviewProps {
  /** The theme to dress the preview in. Anything unknown shows the standard look, like the guest menu. */
  themeId: string | null;
  variantId: string | null;
  business: { name?: string; logoUrl?: string; coverImageUrl?: string } | null | undefined;
  tagline: string;
  categories: any[];
  products: any[];
}

const categoryIdOf = (p: any): string | undefined =>
  typeof p.categoryId === 'string' ? p.categoryId : p.categoryId?._id;

const SECTIONS = 2;
const DISHES_PER_SECTION = 2;

/**
 * A phone-sized miniature of the guest menu, in the chosen theme: the café's name, logo and cover and
 * its first two sections with their first two dishes. It is the real CafeThemeScope with the same
 * cafe-* utilities as the guest page, so what the owner sees here is what guests will see.
 */
export const ThemePreview = ({
  themeId,
  variantId,
  business,
  tagline,
  categories,
  products,
}: ThemePreviewProps) => {
  const identity: PublicIdentity = {
    enabled: true,
    mascotRendering: 'light',
    theme: themeId && variantId ? { id: themeId, variantId } : null,
    tagline,
  };

  const orderable = products.filter((p) => p.isAvailable !== false);
  const sections = categories
    .map((c) => ({
      id: c._id as string,
      name: c.name as string,
      dishes: orderable.filter((p) => categoryIdOf(p) === c._id).slice(0, DISHES_PER_SECTION),
    }))
    .filter((s) => s.dishes.length > 0)
    .slice(0, SECTIONS);

  return (
    <div
      role="group"
      aria-label="Menu preview"
      className="relative mx-auto w-[260px] h-[460px] rounded-[28px] border-[5px] border-slate-800 overflow-hidden shadow-lg pointer-events-none select-none"
    >
      <CafeThemeScope identity={identity}>
        <div className="font-cafe-body text-cafe-ink">
          <div className="relative h-24 overflow-hidden bg-cafe-raised">
            {business?.coverImageUrl ? (
              <img src={business.coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                aria-hidden="true"
                className="w-full h-full [background:var(--cafe-cover-fallback)]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>

          <div className="px-3 -mt-6 relative">
            <div className="flex items-center gap-2.5 bg-cafe-surface rounded-cafe-card p-2.5 shadow-cafe-card border border-cafe-line">
              {business?.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-cafe-button text-cafe-on-accent font-black text-sm flex items-center justify-center shrink-0">
                  {business?.name?.charAt(0) || 'C'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-black font-cafe-display leading-tight truncate">
                  {business?.name || 'Your café'}
                </div>
                {tagline && (
                  <div className="text-[10px] font-semibold font-cafe-display text-cafe-neutral-700 leading-snug truncate">
                    {tagline}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 pt-3 pb-4 space-y-3">
            {sections.length === 0 ? (
              <p className="py-6 text-center text-[10px] font-semibold text-cafe-muted">
                Your dishes appear here once you add them to the menu.
              </p>
            ) : (
              sections.map((section) => (
                <div key={section.id} className="space-y-1.5">
                  <div className="text-[11px] font-extrabold font-cafe-display text-cafe-ink">
                    {section.name}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.dishes.map((dish) => (
                      <div key={dish._id} className="min-w-0">
                        <div className="relative aspect-square rounded-cafe-image overflow-hidden bg-cafe-raised border border-cafe-line/70 shadow-cafe-card">
                          {dish.imageUrl ? (
                            <img
                              src={dish.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center [background:var(--cafe-dish-fallback)] text-cafe-accent-300">
                              <UtensilsCrossed className="w-5 h-5" />
                            </div>
                          )}
                          {dish.isHouseSpecial && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-cafe-chip bg-cafe-badge-special-bg text-[8px] font-extrabold text-cafe-badge-special-fg">
                              House special
                            </span>
                          )}
                          <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-cafe-button text-cafe-on-accent text-sm font-black flex items-center justify-center">
                            +
                          </span>
                        </div>
                        <div className="pt-1 space-y-0.5">
                          <div className="text-[10px] font-bold font-cafe-display leading-snug line-clamp-2">
                            {dish.name}
                          </div>
                          <div className="text-[10px] font-black">
                            {formatCurrency(dish.pricePaise)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CafeThemeScope>
    </div>
  );
};

export default ThemePreview;
