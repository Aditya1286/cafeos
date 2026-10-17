import { useCallback, useEffect, useState } from 'react';
import identityService from '../services/dashboard/identity';
import type { UpdateIdentityPayload } from '../services/dashboard/identity/types';
import type { StoredBusinessIdentity } from '../types';
import { toast } from '../utils/toast';

/** What the "Café look" card shows as saved. `null` ids mean the standard look. */
export interface CafeLook {
  themeId: string | null;
  variantId: string | null;
  tagline: string;
}

const lookOf = (stored: StoredBusinessIdentity | null | undefined): CafeLook => ({
  // A theme needs both halves; a stray id alone reads as "no theme chosen", as on the guest pages.
  themeId: stored?.themeId && stored?.variantId ? stored.themeId : null,
  variantId: stored?.themeId && stored?.variantId ? stored.variantId : null,
  tagline: stored?.tagline ?? '',
});

/**
 * The owner's saved café look (Settings tab). Starts from the business record the dashboard loaded
 * and, after each save, shows exactly what the server stored. `save` resolves true when saved; on a
 * failure it shows the server's message and leaves the saved look as it was.
 */
export const useCafeIdentity = (stored: StoredBusinessIdentity | null | undefined) => {
  const [look, setLook] = useState<CafeLook>(() => lookOf(stored));
  const [saving, setSaving] = useState(false);

  // The business may load (or reload) after the card mounts.
  useEffect(() => {
    setLook(lookOf(stored));
  }, [stored?.themeId, stored?.variantId, stored?.tagline]);

  const save = useCallback(async (payload: UpdateIdentityPayload): Promise<boolean> => {
    setSaving(true);
    try {
      const saved = await identityService.update(payload);
      setLook({
        themeId: saved.theme?.id ?? null,
        variantId: saved.theme?.variantId ?? null,
        tagline: saved.tagline ?? '',
      });
      toast.success('Café look saved.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not save your café look.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { look, saving, save };
};

export type CafeIdentityState = ReturnType<typeof useCafeIdentity>;
