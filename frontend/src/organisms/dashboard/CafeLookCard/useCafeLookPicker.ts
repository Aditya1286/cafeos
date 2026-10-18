import { useEffect, useState } from 'react';
import { DEFAULT_THEME_ID, THEMES, resolveTheme } from '@/themes';
import { useCafeIdentity } from '@/hooks/useCafeIdentity';

// The themes an owner can pick: every registered theme except the built-in caos look, which is what
// a café has until it picks one.
export const LAUNCH_THEMES = Object.values(THEMES).filter((t) => t.id !== DEFAULT_THEME_ID);

/**
 * What the Café look card (desktop and phone) both do: which theme and colour is shown, a pick that
 * saves straight away, and the tagline being typed. The two views only differ in how they lay it out.
 */
export const useCafeLookPicker = (business: any) => {
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

  return {
    look,
    saving,
    save,
    shown,
    hasTheme,
    choose,
    taglineDraft,
    setTaglineDraft,
    trimmedTagline: taglineDraft.trim(),
  };
};
