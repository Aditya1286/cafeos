import { Check, Palette } from 'lucide-react';
import { inputCls } from '@/molecules/FormField';
import { SnapSlider } from '@/molecules/SnapSlider';
import { ThemePreview } from './ThemePreview';
import { ThemePreviewMini } from './ThemePreviewMini';
import { LAUNCH_THEMES, useCafeLookPicker } from './useCafeLookPicker';
import { SUGGESTED_TAGLINES, TAGLINE_MAX } from './taglines';

interface CafeLookCardMobileProps {
  /** The owner's business record (name, logo, cover, and `identity` as stored). */
  business: any;
  categories: any[];
  products: any[];
}

/**
 * The Café look card on a phone. Same choices as the desktop card (CafeLookCard), laid out for a
 * thumb: the themes slide sideways one at a time, the suggested taglines slide in a row, and the
 * live preview sits under them instead of beside them. The picking itself is `useCafeLookPicker`.
 */
export const CafeLookCardMobile = ({ business, categories, products }: CafeLookCardMobileProps) => {
  const {
    look,
    saving,
    save,
    shown,
    hasTheme,
    choose,
    taglineDraft,
    setTaglineDraft,
    trimmedTagline,
  } = useCafeLookPicker(business);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2.5">
        <Palette className="w-5 h-5 text-brand-500" />
        <div>
          <h3 className="text-sm font-black text-slate-900">Café look</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Slide to see each look. Tap one to use it.
          </p>
        </div>
      </div>

      {/* Stays on screen while scrolling, so a pick shows at once; the full preview is below. */}
      <ThemePreviewMini
        themeId={shown.theme.id}
        variantId={shown.variantId}
        business={business}
        tagline={trimmedTagline}
        categories={categories}
        products={products}
      />

      <div className="space-y-2.5">
        <SnapSlider ariaLabel="Themes" slideClassName="w-[82%]">
          {LAUNCH_THEMES.map((theme) => {
            const active = hasTheme && shown.theme.id === theme.id;
            return (
              <div
                key={theme.id}
                data-testid={`theme-${theme.id}`}
                className={`h-full p-4 rounded-2xl border space-y-3 transition-all ${
                  active ? 'bg-brand-50 border-brand-400 shadow-sm' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => choose(theme.id, theme.variants[0].id)}
                  disabled={saving}
                  aria-pressed={active}
                  className="block w-full text-left disabled:opacity-60"
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
                  className="flex items-center gap-2.5"
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
                        className={`w-9 h-9 rounded-full border-2 border-white shadow transition-all disabled:opacity-60 ${
                          on ? 'ring-2 ring-brand-500' : 'ring-1 ring-slate-300'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </SnapSlider>
        {hasTheme && (
          <button
            type="button"
            onClick={() => save({ themeId: null })}
            disabled={saving}
            className="text-[11px] font-bold text-slate-500 underline underline-offset-2 disabled:opacity-50"
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
            className={inputCls + ' flex-1 min-w-0'}
          />
          <button
            type="button"
            onClick={() => save({ tagline: trimmedTagline })}
            disabled={saving || trimmedTagline === look.tagline}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs disabled:opacity-40 shrink-0"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold text-right">
          {taglineDraft.length}/{TAGLINE_MAX}
        </div>
        <SnapSlider
          ariaLabel="Suggested taglines"
          dots={false}
          snap={false}
          slideClassName="w-auto"
          className="-mx-5 px-5"
        >
          {SUGGESTED_TAGLINES.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTaglineDraft(suggestion)}
              className="px-3 py-1.5 rounded-full bg-slate-100 active:bg-brand-50 text-slate-600 text-[11px] font-bold whitespace-nowrap"
            >
              {suggestion}
            </button>
          ))}
        </SnapSlider>
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
  );
};

export default CafeLookCardMobile;
