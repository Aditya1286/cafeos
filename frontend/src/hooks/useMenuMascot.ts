import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MascotAction, MascotReaction, PeekConfig } from '@/mascot/types';
import type { CategoryTip } from '@/services/public/menu/types';
import type { IdentityEventKind } from '@/services/public/guest';
import guestService from '@/services/public/guest';
import { forgetGuestPass, readGuestPass } from '@/utils/guestPass';

// The mascot on a café's menu (spec §8.1). It is not on screen between pop-ups: it rises from behind
// the café's card with the welcome (the returning guest's own line with "Add" for their usual and
// "Not you?", or the café's generic first-visit line), then from behind each category's top bar with
// that category's tip, with an "Add" button for the recommended item. Each is shown at most once per
// session, never over the welcome, and tips stop once something is in the cart. All copy comes from
// the server. The page marks the cards with `data-mascot-peek="<peek id>"` (see `peekSelector`).

/** How long the welcome's bubble stays up. */
export const WELCOME_MS = 7000;
export const TIP_MS = 6000;
/** A welcome that has not got to rise this long after it was ready (the guest scrolled on, or there
 * was no clear spot) is dropped, so the category tips are not held up behind it for good. */
export const WELCOME_GIVE_UP_MS = 15_000;
export const welcomedKey = (businessId: string) => `caos_welcomed_${businessId}`;
export const tipsKey = (businessId: string) => `caos_tips_${businessId}`;

/** The welcome's peek id (`menu-welcome`, or `menu-welcome:generic` after "Not you?"). */
export const welcomePeekId = (key: 'welcome' | 'welcome:generic') => `menu-${key}`;
/** The card the welcome rises from, whichever welcome it is. */
export const WELCOME_CARD = 'menu-welcome';
/** The peek id of a category's tip, and the `data-mascot-peek` value on that category's top bar. */
export const tipPeekId = (categoryId: string) => `tip:${categoryId}`;
export const peekSelector = (peekId: string) => `[data-mascot-peek="${peekId}"]`;

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

// Opening the menu with `?mascot=reset` forgets which pop-ups this tab has already seen, so the
// welcome and the tips can be looked at again (a demo, or checking a change).
export const RESET_PARAM = 'mascot';
const resetIfAsked = (businessId: string) => {
  if (new URLSearchParams(window.location.search).get(RESET_PARAM) !== 'reset') return;
  try {
    window.sessionStorage.removeItem(welcomedKey(businessId));
    window.sessionStorage.removeItem(tipsKey(businessId));
  } catch {
    /* nothing remembered to forget */
  }
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
}

export interface MenuMascot {
  /** Where the mascot may pop up from right now, for `<PageMascot peeks>`. */
  peeks: PeekConfig[];
  /** For `<PageMascot onPeek>`: the mascot rose from a card (id) or sank back (null). */
  onPeek: (peekId: string | null) => void;
  onAction: (id: string) => void;
}

type Welcome = {
  key: 'welcome' | 'welcome:generic';
  line: string;
  usual?: MenuProduct;
  returning: boolean;
};

export const useMenuMascot = ({
  business,
  ready,
  categoryTips,
  firstVisitLine,
  products,
  cartCount,
  addToCart,
}: UseMenuMascotOptions): MenuMascot => {
  const businessId: string = business?._id ?? business?.id ?? '';
  const enabled = !!business?.identity?.enabled && !!businessId && ready;

  const [welcome, setWelcome] = useState<Welcome | null>(null);
  // True once the welcome has been and gone, or there is none: category tips wait for it.
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [shownTips, setShownTips] = useState<Set<string>>(() => new Set());
  /** The peek whose greeting is on screen now. It is only counted as shown once the mascot sinks
   * again: taking a peek out of the list while it is up would make it sink at once. */
  const greeted = useRef<string | null>(null);

  const productsRef = useRef(products);
  productsRef.current = products;
  const firstVisitRef = useRef(firstVisitLine);
  firstVisitRef.current = firstVisitLine;
  const addToCartRef = useRef(addToCart);
  addToCartRef.current = addToCart;
  const tipsRef = useRef(categoryTips);
  tipsRef.current = categoryTips;

  const record = useCallback(
    (kind: IdentityEventKind) => businessId && guestService.recordEvent({ businessId, kind }),
    [businessId],
  );

  useEffect(() => {
    if (!enabled) return;
    resetIfAsked(businessId);
    setShownTips(readShownTips(businessId));
  }, [enabled, businessId]);

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
      const known = token
        ? await guestService.getWelcome(businessId, token).catch(() => null)
        : null;
      if (cancelled) return;
      // Marked only once it is really there, so a cancelled first run (StrictMode) doesn't eat it.
      session.set(welcomedKey(businessId), '1');
      if (known) {
        const usual = known.usualProductId
          ? productsRef.current.find(
              (p) => p._id === known.usualProductId && p.isAvailable !== false,
            )
          : undefined;
        setWelcome({ key: 'welcome', line: known.line, usual, returning: true });
        return;
      }
      const generic = firstVisitRef.current?.trim();
      if (generic) setWelcome({ key: 'welcome', line: generic, returning: false });
      else setWelcomeDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, businessId]);

  useEffect(() => {
    if (!welcome) return;
    const timer = setTimeout(() => {
      if (greeted.current) return; // it is up right now: it ends on its own
      setWelcome(null);
      setWelcomeDone(true);
    }, WELCOME_GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [welcome]);

  const peeks = useMemo((): PeekConfig[] => {
    if (!enabled) return [];
    const list: PeekConfig[] = [];

    if (welcome) {
      const actions: MascotAction[] = [];
      if (welcome.usual) actions.push({ id: 'add-usual', label: 'Add' });
      if (welcome.returning) actions.push({ id: 'not-you', label: 'Not you?' });
      const greet: MascotReaction = {
        expression: 'excited',
        gesture: 'wave',
        message: {
          id: `menu-${welcome.key}`,
          text: welcome.line,
          durationMs: WELCOME_MS,
          ...(actions.length ? { actions } : {}),
        },
      };
      list.push({
        peekId: welcomePeekId(welcome.key),
        selector: peekSelector(WELCOME_CARD),
        anchor: 0.86,
        greet,
      });
    }

    // Tips, from each category's top bar, after the welcome and until the first add.
    if (welcomeDone && cartCount === 0) {
      for (const [categoryId, tip] of Object.entries(categoryTips ?? {})) {
        if (shownTips.has(categoryId)) continue;
        const product = products.find((p) => p._id === tip.productId && p.isAvailable !== false);
        const greet: MascotReaction = {
          expression: 'confident',
          gesture: 'nod',
          message: {
            id: `menu-tip-${categoryId}`,
            text: tip.line,
            durationMs: TIP_MS,
            ...(product ? { actions: [{ id: 'add-tip', label: 'Add' }] } : {}),
          },
        };
        list.push({
          peekId: tipPeekId(categoryId),
          selector: peekSelector(tipPeekId(categoryId)),
          anchor: 0.9,
          greet,
        });
      }
    }
    return list;
  }, [enabled, welcome, welcomeDone, cartCount, categoryTips, shownTips, products]);

  const onPeek = useCallback(
    (peekId: string | null) => {
      if (peekId) {
        greeted.current = peekId;
        record(peekId.startsWith('tip:') ? 'tip_shown' : 'welcome_shown');
        return;
      }
      const ended = greeted.current;
      greeted.current = null;
      if (!ended) return; // sank before it said anything: it comes up again next time
      if (ended.startsWith('tip:')) {
        const categoryId = ended.slice('tip:'.length);
        setShownTips((prev) => {
          const next = new Set(prev).add(categoryId);
          session.set(tipsKey(businessId), JSON.stringify([...next]));
          return next;
        });
      } else {
        // The welcome has been and gone (unless "Not you?" has already swapped in the generic one).
        setWelcome((prev) => (prev && welcomePeekId(prev.key) === ended ? null : prev));
        setWelcomeDone(true);
      }
    },
    [businessId, record],
  );

  const onAction = useCallback(
    (id: string) => {
      if (id === 'add-usual' && welcome?.usual) {
        addToCartRef.current(welcome.usual);
        record('welcome_usual_added');
      } else if (id === 'add-tip' && greeted.current?.startsWith('tip:')) {
        const tip = tipsRef.current?.[greeted.current.slice('tip:'.length)];
        const product = productsRef.current.find(
          (p) => p._id === tip?.productId && p.isAvailable !== false,
        );
        if (product) addToCartRef.current(product);
      } else if (id === 'not-you') {
        forgetGuestPass(businessId);
        record('not_you_clicked');
        const generic = firstVisitRef.current?.trim();
        // The generic welcome takes the same card; the mascot sinks and rises again with it.
        setWelcome(generic ? { key: 'welcome:generic', line: generic, returning: false } : null);
        if (!generic) setWelcomeDone(true);
      }
    },
    [welcome, businessId, record],
  );

  return { peeks, onPeek, onAction };
};

export default useMenuMascot;
