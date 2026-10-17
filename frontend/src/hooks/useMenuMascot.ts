import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MascotAction, MascotReaction } from '@/mascot/types';
import type { CategoryTip } from '@/services/public/menu/types';
import type { IdentityEventKind } from '@/services/public/guest';
import guestService from '@/services/public/guest';
import { forgetGuestPass, readGuestPass } from '@/utils/guestPass';

// The mascot on a café's menu (spec §8.1): one welcome per café per browser session (the returning
// guest's own line with "Add" for their usual and "Not you?", or the café's generic first-visit line),
// then a tip per category as each one comes into view, each at most once per session, never over the
// welcome, and none once something is in the cart. All copy comes from the server.

/** How long the welcome owns the mascot before category tips may speak. */
export const WELCOME_MS = 7000;
export const TIP_MS = 5000;
export const welcomedKey = (businessId: string) => `caos_welcomed_${businessId}`;
export const tipsKey = (businessId: string) => `caos_tips_${businessId}`;

// sessionStorage can be blocked (private windows): then the welcome may repeat, nothing breaks.
const session = {
  get(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* not remembered */
    }
  },
};

const readShownTips = (businessId: string): Set<string> => {
  try {
    const parsed: unknown = JSON.parse(session.get(tipsKey(businessId)) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

interface MenuProduct {
  _id: string;
  isAvailable?: boolean;
  [key: string]: any;
}

export interface UseMenuMascotOptions {
  business: { _id?: string; id?: string; identity?: { enabled?: boolean } | null } | null;
  /** True once the menu (with its tips and first-visit line) has loaded. */
  ready: boolean;
  categoryTips?: Record<string, CategoryTip>;
  firstVisitLine?: string;
  products: MenuProduct[];
  cartCount: number;
  addToCart: (product: MenuProduct) => void;
  /** Changes when the category sections are re-rendered (search, filters), so they are observed again. */
  sectionsKey?: string;
}

export interface MenuMascot {
  signal: string | null;
  reactions: Record<string, MascotReaction>;
  onAction: (id: string) => void;
}

type Welcome = { key: 'welcome' | 'welcome:generic'; line: string; usual?: MenuProduct; returning: boolean };

export const useMenuMascot = ({
  business,
  ready,
  categoryTips,
  firstVisitLine,
  products,
  cartCount,
  addToCart,
  sectionsKey = '',
}: UseMenuMascotOptions): MenuMascot => {
  const businessId: string = business?._id ?? business?.id ?? '';
  const enabled = !!business?.identity?.enabled && !!businessId && ready;

  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [signal, setSignal] = useState<string | null>(null);
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productsRef = useRef(products);
  productsRef.current = products;
  const firstVisitRef = useRef(firstVisitLine);
  firstVisitRef.current = firstVisitLine;
  const cartCountRef = useRef(cartCount);
  cartCountRef.current = cartCount;
  const addToCartRef = useRef(addToCart);
  addToCartRef.current = addToCart;

  const record = useCallback(
    (kind: IdentityEventKind) => businessId && guestService.recordEvent({ businessId, kind }),
    [businessId],
  );

  const show = useCallback((next: Welcome) => {
    setWelcome(next);
    setSignal(next.key);
    setWelcomeDone(false);
    if (welcomeTimer.current) clearTimeout(welcomeTimer.current);
    welcomeTimer.current = setTimeout(() => setWelcomeDone(true), WELCOME_MS);
  }, []);

  useEffect(() => () => {
    if (welcomeTimer.current) clearTimeout(welcomeTimer.current);
  }, []);

  // The welcome: once per café per browser session.
  useEffect(() => {
    if (!enabled) return;
    if (session.get(welcomedKey(businessId))) {
      setWelcomeDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = readGuestPass(businessId);
      const known = token ? await guestService.getWelcome(businessId, token).catch(() => null) : null;
      if (cancelled) return;
      // Marked only once it is really shown, so a cancelled first run (StrictMode) doesn't eat it.
      session.set(welcomedKey(businessId), '1');
      if (known) {
        const usual = known.usualProductId
          ? productsRef.current.find((p) => p._id === known.usualProductId && p.isAvailable !== false)
          : undefined;
        show({ key: 'welcome', line: known.line, usual, returning: true });
        record('welcome_shown');
        return;
      }
      const generic = firstVisitRef.current?.trim();
      if (generic) {
        show({ key: 'welcome', line: generic, returning: false });
        record('welcome_shown');
      } else {
        setWelcomeDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, businessId, show, record]);

  // Category tips, as each category comes into view (after the welcome, before the first add).
  const cartEmpty = cartCount === 0;
  useEffect(() => {
    if (!enabled || !welcomeDone || !cartEmpty || !categoryTips) return;
    if (!Object.keys(categoryTips).length || typeof IntersectionObserver === 'undefined') return;
    const shown = readShownTips(businessId);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || cartCountRef.current > 0) continue;
          const id = (entry.target as HTMLElement).dataset.categoryId;
          if (!id || !categoryTips[id] || shown.has(id)) continue;
          shown.add(id);
          session.set(tipsKey(businessId), JSON.stringify([...shown]));
          setSignal(`tip:${id}`);
          record('tip_shown');
          break;
        }
      },
      // "In view" = crossing a band through the middle of the screen, below the sticky search bar.
      { rootMargin: '-35% 0px -45% 0px', threshold: 0 },
    );
    document.querySelectorAll<HTMLElement>('[data-category-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled, welcomeDone, cartEmpty, categoryTips, businessId, sectionsKey, record]);

  const reactions = useMemo(() => {
    const map: Record<string, MascotReaction> = {};
    if (!enabled) return map;
    if (welcome) {
      const actions: MascotAction[] = [];
      if (welcome.usual) actions.push({ id: 'add-usual', label: 'Add' });
      if (welcome.returning) actions.push({ id: 'not-you', label: 'Not you?' });
      map[welcome.key] = {
        expression: 'excited',
        gesture: 'wave',
        message: {
          id: `menu-${welcome.key}`,
          text: welcome.line,
          durationMs: WELCOME_MS,
          ...(actions.length ? { actions } : {}),
        },
      };
    }
    for (const [categoryId, tip] of Object.entries(categoryTips ?? {})) {
      map[`tip:${categoryId}`] = {
        expression: 'confident',
        gesture: 'nod',
        message: { id: `menu-tip-${categoryId}`, text: tip.line, durationMs: TIP_MS },
      };
    }
    return map;
  }, [enabled, welcome, categoryTips]);

  const onAction = useCallback(
    (id: string) => {
      if (id === 'add-usual' && welcome?.usual) {
        addToCartRef.current(welcome.usual);
        record('welcome_usual_added');
      } else if (id === 'not-you') {
        forgetGuestPass(businessId);
        record('not_you_clicked');
        const generic = firstVisitRef.current?.trim();
        if (generic) show({ key: 'welcome:generic', line: generic, returning: false });
        else {
          setWelcome(null);
          setSignal(null);
          setWelcomeDone(true);
        }
      }
    },
    [welcome, businessId, record, show],
  );

  return { signal: enabled ? signal : null, reactions, onAction };
};

export default useMenuMascot;
