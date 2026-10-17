import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { DEFAULT_THEME_ID, THEMES, resolveTheme } from '@/themes';
import { useCafeIdentity } from '@/hooks/useCafeIdentity';
import { inputCls } from '@/molecules/FormField';
import { ThemePreview } from './ThemePreview';
import { SUGGESTED_TAGLINES, TAGLINE_MAX } from './taglines';

interface CafeLookCardProps {
  /** The owner's business record (name, logo, cover, and `identity` as stored). */
  business: any;
  categories: any[];
  products: any[];
}

// The themes an owner can pick: every registered theme except the built-in caos look, which is what
// a café has until it picks one.
const LAUNCH_THEMES = Object.values(THEMES).filter((t) => t.id !== DEFAULT_THEME_ID);

/**
 * Settings tab: the owner picks the café's theme and colour variant and writes a short tagline, with
 * a live phone preview. A pick saves straight away (the preview already shows it); the tagline has
 * its own Save. Shown only while a super admin has switched café identity on for this café.
 */
export const CafeLookCard = ({ business, categories, products }: CafeLookCardProps) => {
  const { look, saving, save } = useCafeIdentity(business?.identity);
  // The pick being saved, shown at once so the preview doesn't wait on the network.
  const [pick, setPick] = useState<{ themeId: string; variantId: string } | null>(null);
  const [taglineDraft, setTaglineDraft] = useState(look.tagline);
  useEffect(() => setTaglineDraft(look.tagline), [look.tagline]);

  // An unknown or retired stored theme resolves to caos, as on the guest pages: nothing is selected.
  const shown = resolveTheme(pick?.themeId ?? look.themeId, pick?.variantId ?? look.variantId);
  const hasTheme = shown.theme.id !== DEFAULT_THEME_ID;

  const choose = async (themeId: string, variantId: string) => {
    if (saving || (hasTheme && shown.theme.id === themeId && shown.variantId === variantId)) return;
    setPick({ themeId, variantId });
    await save({ themeId, variantId });
    setPick(null);
  };

  const trimmedTagline = taglineDraft.trim();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <Palette className="w-5 h-5 text-brand-500" />
        <div>
          <h3 className="text-sm font-black text-slate-900">Café look</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            How your menu and order tracker look to customers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-6">
        <div className="space-y-5 min-w-0">
          <div className="space-y-2.5">
            {LAUNCH_THEMES.map((theme) => {
              const active = hasTheme && shown.theme.id === theme.id;
              return (
                <div
                  key={theme.id}
                  data-testid={`theme-${theme.id}`}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    active ? 'bg-brand-50 border-brand-400 shadow-sm' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => choose(theme.id, theme.variants[0].id)}
                      disabled={saving}
                      aria-pressed={active}
                      className="min-w-0 text-left disabled:opacity-60"
                    >
                      <span
                        className={`flex items-center gap-1.5 text-sm font-black ${active ? 'text-brand-700' : 'text-slate-800'}`}
                      >
                        {theme.name}
                        {active && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                        {theme.description}
                      </span>
                    </button>
                    <div
                      role="group"
                      aria-label={`${theme.name} colours`}
                      className="flex items-center gap-2 shrink-0"
                    >
                      {theme.variants.map((variant) => {
                        const on = active && shown.variantId === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => choose(theme.id, variant.id)}
                            disabled={saving}
                            aria-label={`${theme.name} ${variant.name}`}
                            aria-pressed={on}
                            title={variant.name}
                            style={{ backgroundColor: variant.swatch }}
                            className={`w-7 h-7 rounded-full border-2 border-white shadow transition-all disabled:opacity-60 ${
                              on ? 'ring-2 ring-brand-500' : 'ring-1 ring-slate-300'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasTheme && (
              <button
                type="button"
                onClick={() => save({ themeId: null })}
                disabled={saving}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 disabled:opacity-50"
              >
                Go back to the standard look
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cafe-tagline"
              className="text-[10px] font-extrabold uppercase text-slate-400"
            >
              Tagline
            </label>
            <div className="flex gap-2">
              <input
                id="cafe-tagline"
                type="text"
                value={taglineDraft}
                maxLength={TAGLINE_MAX}
                onChange={(e) => setTaglineDraft(e.target.value.slice(0, TAGLINE_MAX))}
                placeholder="A line about your café"
                className={inputCls + ' flex-1'}
              />
              <button
                type="button"
                onClick={() => save({ tagline: trimmedTagline })}
                disabled={saving || trimmedTagline === look.tagline}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all shrink-0"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold text-right">
              {taglineDraft.length}/{TAGLINE_MAX}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGLINES.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTaglineDraft(suggestion)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 text-[11px] font-bold transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ThemePreview
          themeId={shown.theme.id}
          variantId={shown.variantId}
          business={business}
          tagline={trimmedTagline}
          categories={categories}
          products={products}
        />
      </div>
    </div>
  );
};

export default CafeLookCard;
