import { KDS_KITCHEN_MODE_KEY } from '@/constants/kitchen';

// Whether the kitchen board is in Kitchen mode (full screen) is remembered per browser, so a
// wall-mounted tablet comes back the way it was left. Storage can be blocked or unavailable, so
// this is only a convenience: it never throws, and falls back to the default.

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** The saved choice, or `fallback` when none was made (staff default to on, owners to off). */
export const readKitchenMode = (
  fallback: boolean,
  store: KeyValueStore | null = browserStorage(),
): boolean => {
  try {
    const saved = store?.getItem(KDS_KITCHEN_MODE_KEY);
    return saved === '1' ? true : saved === '0' ? false : fallback;
  } catch {
    return fallback;
  }
};

export const writeKitchenMode = (
  on: boolean,
  store: KeyValueStore | null = browserStorage(),
): void => {
  try {
    store?.setItem(KDS_KITCHEN_MODE_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable: the choice just won't persist */
  }
};
