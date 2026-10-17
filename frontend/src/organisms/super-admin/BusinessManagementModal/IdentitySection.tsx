import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { DEFAULT_THEME_ID, THEMES } from '@/themes';
import type { AdminIdentityPayload } from '@/services/superAdmin/identity/types';
import type { StoredBusinessIdentity } from '@/types';

interface IdentitySectionProps {
  /** The café's stored identity record; missing counts as off with no theme. */
  identity: StoredBusinessIdentity | undefined;
  saving: boolean;
  /** Resolves true when saved. */
  onSet: (payload: AdminIdentityPayload) => Promise<boolean>;
}

// The themes a café can be given: every registered theme except the built-in caos look.
const LAUNCH_THEMES = Object.values(THEMES).filter((t) => t.id !== DEFAULT_THEME_ID);

const selectCls =
  'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-50';

/**
 * Super admin: switch café identity on or off for one café, and set its theme and colour variant (for
 * onboarding, so it can be set before the café is switched on). The owner can later change the
 * theme and tagline themselves, but only while this switch is on.
 */
export const IdentitySection = ({ identity, saving, onSet }: IdentitySectionProps) => {
  const enabled = !!identity?.enabled;
  const storedTheme = LAUNCH_THEMES.find((t) => t.id === identity?.themeId);
  const storedVariant =
    storedTheme?.variants.find((v) => v.id === identity?.variantId) ?? storedTheme?.variants[0];

  const [themeId, setThemeId] = useState(storedTheme?.id ?? '');
  const [variantId, setVariantId] = useState(storedVariant?.id ?? '');
  useEffect(() => {
    setThemeId(storedTheme?.id ?? '');
    setVariantId(storedVariant?.id ?? '');
  }, [storedTheme?.id, storedVariant?.id]);

  const draftTheme = LAUNCH_THEMES.find((t) => t.id === themeId);
  const changed = themeId !== (storedTheme?.id ?? '') || (!!themeId && variantId !== storedVariant?.id);

  const pickTheme = (id: string) => {
    setThemeId(id);
    setVariantId(LAUNCH_THEMES.find((t) => t.id === id)?.variants[0].id ?? '');
  };

  return (
    <div className="pt-5 mt-1 border-t border-slate-100 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Palette className="w-4 h-4 text-brand-500 shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-900">Café identity</h4>
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              {enabled
                ? 'On. The café can pick its own look in Settings.'
                : 'Off. Guests see the standard look.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Café identity"
          disabled={saving}
          onClick={() => onSet({ enabled: !enabled })}
          className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-brand-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Theme</span>
          <select
            value={themeId}
            onChange={(e) => pickTheme(e.target.value)}
            disabled={saving}
            className={selectCls}
          >
            <option value="">Standard look</option>
            {LAUNCH_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Colour</span>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            disabled={saving || !draftTheme}
            className={selectCls}
          >
            {!draftTheme && <option value="">Default</option>}
            {draftTheme?.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={saving || !changed}
        onClick={() => onSet(themeId ? { themeId, variantId } : { themeId: null })}
        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold disabled:opacity-40 transition-all"
      >
        {saving ? 'Saving...' : 'Save theme'}
      </button>
    </div>
  );
};

export default IdentitySection;
