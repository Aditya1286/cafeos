// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getWelcome, recordEvent, readGuestPass, forgetGuestPass } = vi.hoisted(() => ({
  getWelcome: vi.fn(),
  recordEvent: vi.fn(),
  readGuestPass: vi.fn(),
  forgetGuestPass: vi.fn(),
}));
vi.mock('@/services/public/guest', () => ({ default: { getWelcome, recordEvent } }));
vi.mock('@/utils/guestPass', () => ({ readGuestPass, forgetGuestPass }));

import {
  useMenuMascot,
  WELCOME_CARD,
  WELCOME_MS,
  WELCOME_GIVE_UP_MS,
  type UseMenuMascotOptions,
} from '@/hooks/useMenuMascot';

const BIZ = 'a'.repeat(24);
const chai = { _id: 'p-chai', name: 'Masala chai', isAvailable: true };
const fries = { _id: 'p-fries', name: 'Peri peri fries', isAvailable: true };

const options = (over: Partial<UseMenuMascotOptions> = {}): UseMenuMascotOptions => ({
  business: { _id: BIZ, identity: { enabled: true } },
  ready: true,
  categoryTips: {
    snacks: {
      productId: 'p-fries',
      line: 'Snacks? The peri peri fries are the most ordered here.',
      kind: 'best-seller',
    },
    drinks: { productId: 'p-chai', line: 'Drinks? Try the masala chai.', kind: 'best-seller' },
  },
  firstVisitLine: 'Welcome to Chai Point!',
  products: [chai, fries],
  cartCount: 0,
  addToCart: vi.fn(),
  ...over,
});

const flush = () => act(async () => {});
const ids = (peeks: { peekId: string }[]) => peeks.map((p) => p.peekId);
/** The mascot rose from a card, said its piece, and sank back (what the engine reports). */
const showAndSink = (result: { current: ReturnType<typeof useMenuMascot> }, peekId: string) => {
  act(() => result.current.onPeek(peekId));
  act(() => result.current.onPeek(null));
};

beforeEach(() => {
  window.sessionStorage.clear();
  getWelcome.mockReset();
  recordEvent.mockReset();
  readGuestPass.mockReset();
  forgetGuestPass.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the welcome', () => {
  it('a guest with a pass is welcomed once per session, and not again after a remount', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({
      line: 'Welcome back, Asha! Masala chai again?',
      usualProductId: 'p-chai',
    });
    const first = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(getWelcome).toHaveBeenCalledWith(BIZ, 't.o.k');
    const welcome = first.result.current.peeks[0];
    expect(welcome.peekId).toBe('menu-welcome');
    expect(welcome.selector).toBe(`[data-mascot-peek="${WELCOME_CARD}"]`);
    expect(welcome.greet.message!.text).toBe('Welcome back, Asha! Masala chai again?');
    expect(welcome.greet.message!.durationMs).toBe(WELCOME_MS);
    expect(welcome.greet.message!.actions).toEqual([
      { id: 'add-usual', label: 'Add' },
      { id: 'not-you', label: 'Not you?' },
    ]);
    first.unmount();

    const second = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(ids(second.result.current.peeks).some((id) => id.startsWith('menu-welcome'))).toBe(
      false,
    );
    expect(getWelcome).toHaveBeenCalledTimes(1);
  });

  it('is counted as shown only when the mascot has actually risen to say it', async () => {
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(recordEvent).not.toHaveBeenCalled();
    act(() => result.current.onPeek('menu-welcome'));
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'welcome_shown' });
  });

  it('without a pass the welcome is the café’s generic first-visit line', async () => {
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(getWelcome).not.toHaveBeenCalled();
    expect(result.current.peeks[0].greet.message!.text).toBe('Welcome to Chai Point!');
    expect(result.current.peeks[0].greet.message!.actions).toBeUndefined();
  });

  it('a pass the server doesn’t recognise (204) also gets the generic line', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(result.current.peeks[0].greet.message!.text).toBe('Welcome to Chai Point!');
  });

  it('no "Add" when the usual is not on the menu', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha!', usualProductId: 'p-gone' });
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(result.current.peeks[0].greet.message!.actions).toEqual([
      { id: 'not-you', label: 'Not you?' },
    ]);
  });

  it('stays silent while identity is off', async () => {
    const { result } = renderHook(() =>
      useMenuMascot(options({ business: { _id: BIZ, identity: { enabled: false } } })),
    );
    await flush();
    expect(result.current.peeks).toEqual([]);
  });

  it('goes away once it has been and gone', async () => {
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    showAndSink(result, 'menu-welcome');
    expect(ids(result.current.peeks).some((id) => id.startsWith('menu-welcome'))).toBe(false);
  });
});

describe('?mascot=reset', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('forgets what this tab has already seen, so the welcome and tips come back', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    window.sessionStorage.setItem(`caos_tips_${BIZ}`, JSON.stringify(['snacks', 'drinks']));
    window.history.replaceState({}, '', '/c/chai?mascot=reset');
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(ids(result.current.peeks)).toEqual(['menu-welcome']);
    showAndSink(result, 'menu-welcome');
    expect(ids(result.current.peeks)).toEqual(['tip:snacks', 'tip:drinks']);
  });

  it('does nothing without the parameter', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(ids(result.current.peeks).includes('menu-welcome')).toBe(false);
  });
});

describe('the category tips', () => {
  it('wait for the welcome: only the welcome can pop up while it is pending', async () => {
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(ids(result.current.peeks)).toEqual(['menu-welcome']);

    showAndSink(result, 'menu-welcome');
    expect(ids(result.current.peeks)).toEqual(['tip:snacks', 'tip:drinks']);
  });

  it('are not held up for good by a welcome that never got to rise', async () => {
    vi.useFakeTimers();
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(ids(result.current.peeks)).toEqual(['menu-welcome']);
    act(() => {
      vi.advanceTimersByTime(WELCOME_GIVE_UP_MS + 100);
    });
    expect(ids(result.current.peeks)).toEqual(['tip:snacks', 'tip:drinks']);
  });

  it('are a pop-up from each category’s top bar, with an Add button for the recommended item', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    const snacks = result.current.peeks.find((p) => p.peekId === 'tip:snacks')!;
    expect(snacks.selector).toBe('[data-mascot-peek="tip:snacks"]');
    expect(snacks.greet.message!.text).toMatch(/peri peri fries/);
    expect(snacks.greet.message!.actions).toEqual([{ id: 'add-tip', label: 'Add' }]);
  });

  it('have no Add button when the recommended item is not available', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() =>
      useMenuMascot(options({ products: [chai, { ...fries, isAvailable: false }] })),
    );
    await flush();
    expect(
      result.current.peeks.find((p) => p.peekId === 'tip:snacks')!.greet.message!.actions,
    ).toBeUndefined();
    expect(
      result.current.peeks.find((p) => p.peekId === 'tip:drinks')!.greet.message!.actions,
    ).toBeDefined();
  });

  it('are counted when the mascot rises, and each fires at most once', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    showAndSink(result, 'tip:snacks');
    expect(ids(result.current.peeks)).toEqual(['tip:drinks']);
    showAndSink(result, 'tip:drinks');
    expect(result.current.peeks).toEqual([]);
    expect(recordEvent.mock.calls.filter(([e]) => e.kind === 'tip_shown')).toHaveLength(2);
  });

  it('stays available if the mascot sank before it said anything', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    act(() => result.current.onPeek(null)); // flicked past: it never greeted
    expect(ids(result.current.peeks)).toEqual(['tip:snacks', 'tip:drinks']);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('stays in the list while its pop-up is up, so the mascot is not sent away mid-sentence', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    act(() => result.current.onPeek('tip:snacks'));
    expect(ids(result.current.peeks)).toContain('tip:snacks');
  });

  it('are remembered for the session, so a remount does not repeat them', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const first = renderHook(() => useMenuMascot(options()));
    await flush();
    showAndSink(first.result, 'tip:snacks');
    first.unmount();

    const second = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(ids(second.result.current.peeks)).toEqual(['tip:drinks']);
  });

  it('stop once something is in the cart', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    let cartCount = 0;
    const { result, rerender } = renderHook(() => useMenuMascot(options({ cartCount })));
    await flush();
    expect(result.current.peeks).toHaveLength(2);
    cartCount = 1;
    rerender();
    expect(result.current.peeks).toEqual([]);
  });
});

describe('the buttons in the bubble', () => {
  it('"Add" on the welcome puts the usual in the cart', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha!', usualProductId: 'p-chai' });
    const addToCart = vi.fn();
    const { result } = renderHook(() => useMenuMascot(options({ addToCart })));
    await flush();
    act(() => result.current.onAction('add-usual'));
    expect(addToCart).toHaveBeenCalledWith(chai);
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'welcome_usual_added' });
  });

  it('"Add" on a tip puts the recommended item in the cart, but only while that tip is up', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const addToCart = vi.fn();
    const { result } = renderHook(() => useMenuMascot(options({ addToCart })));
    await flush();
    act(() => result.current.onAction('add-tip')); // no tip is up
    expect(addToCart).not.toHaveBeenCalled();

    act(() => result.current.onPeek('tip:snacks'));
    act(() => result.current.onAction('add-tip'));
    expect(addToCart).toHaveBeenCalledWith(fries);
  });

  it('"Not you?" forgets the pass and swaps in the generic welcome on the same card', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha!', usualProductId: 'p-chai' });
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    act(() => result.current.onPeek('menu-welcome'));
    act(() => result.current.onAction('not-you'));
    expect(forgetGuestPass).toHaveBeenCalledWith(BIZ);
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'not_you_clicked' });

    const generic = result.current.peeks.find((p) => p.peekId === 'menu-welcome:generic')!;
    expect(generic.greet.message!.text).toBe('Welcome to Chai Point!');
    expect(generic.greet.message!.actions).toBeUndefined();
    expect(generic.selector).toBe(`[data-mascot-peek="${WELCOME_CARD}"]`);
    expect(result.current.peeks.find((p) => p.peekId === 'menu-welcome')).toBeUndefined();

    // The mascot sinks behind the card and rises again with the new line; the swap survives that.
    act(() => result.current.onPeek(null));
    expect(ids(result.current.peeks)).toContain('menu-welcome:generic');
  });
});
