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

import { useMenuMascot, WELCOME_MS, type UseMenuMascotOptions } from '@/hooks/useMenuMascot';

const BIZ = 'a'.repeat(24);
const chai = { _id: 'p-chai', name: 'Masala chai', isAvailable: true };
const fries = { _id: 'p-fries', name: 'Peri peri fries', isAvailable: true };

// A controllable IntersectionObserver: tests say which category scrolled into view.
let observers: { cb: IntersectionObserverCallback; els: Element[]; live: boolean }[] = [];
class FakeObserver {
  private rec: { cb: IntersectionObserverCallback; els: Element[]; live: boolean };
  constructor(cb: IntersectionObserverCallback) {
    this.rec = { cb, els: [], live: true };
    observers.push(this.rec);
  }
  observe(el: Element) {
    this.rec.els.push(el);
  }
  disconnect() {
    this.rec.live = false;
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
}
const scrollTo = (categoryId: string) => {
  for (const o of observers.filter((x) => x.live)) {
    const el = o.els.find((e) => (e as HTMLElement).dataset.categoryId === categoryId);
    if (el) act(() => o.cb([{ isIntersecting: true, target: el } as any], o as any));
  }
};

const options = (over: Partial<UseMenuMascotOptions> = {}): UseMenuMascotOptions => ({
  business: { _id: BIZ, identity: { enabled: true } },
  ready: true,
  categoryTips: {
    snacks: { productId: 'p-fries', line: 'Snacks? The peri peri fries are the most ordered here.', kind: 'best-seller' },
    drinks: { productId: 'p-chai', line: 'Drinks? Try the masala chai.', kind: 'best-seller' },
  },
  firstVisitLine: 'Welcome to Chai Point!',
  products: [chai, fries],
  cartCount: 0,
  addToCart: vi.fn(),
  ...over,
});

const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  (globalThis as any).IntersectionObserver = FakeObserver;
  window.sessionStorage.clear();
  document.body.innerHTML = '<section data-category-id="snacks"></section><section data-category-id="drinks"></section>';
  getWelcome.mockReset();
  recordEvent.mockReset();
  readGuestPass.mockReset();
  forgetGuestPass.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useMenuMascot', () => {
  it('a guest with a pass is welcomed once per session, and not again after a remount', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha! Masala chai again?', usualProductId: 'p-chai' });
    const first = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(getWelcome).toHaveBeenCalledWith(BIZ, 't.o.k');
    expect(first.result.current.signal).toBe('welcome');
    const msg = first.result.current.reactions.welcome.message!;
    expect(msg.text).toBe('Welcome back, Asha! Masala chai again?');
    expect(msg.actions).toEqual([
      { id: 'add-usual', label: 'Add' },
      { id: 'not-you', label: 'Not you?' },
    ]);
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'welcome_shown' });
    first.unmount();

    const second = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(second.result.current.signal).toBeNull();
    expect(getWelcome).toHaveBeenCalledTimes(1);
  });

  it('without a pass the welcome is the café’s generic first-visit line', async () => {
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(getWelcome).not.toHaveBeenCalled();
    expect(result.current.signal).toBe('welcome');
    expect(result.current.reactions.welcome.message!.text).toBe('Welcome to Chai Point!');
    expect(result.current.reactions.welcome.message!.actions).toBeUndefined();
  });

  it('a pass the server doesn’t recognise (204) also gets the generic line', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(result.current.reactions.welcome.message!.text).toBe('Welcome to Chai Point!');
  });

  it('no "Add" when the usual is not on the menu', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha!', usualProductId: 'p-gone' });
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    expect(result.current.reactions.welcome.message!.actions).toEqual([{ id: 'not-you', label: 'Not you?' }]);
  });

  it('stays silent while identity is off', async () => {
    const { result } = renderHook(() =>
      useMenuMascot(options({ business: { _id: BIZ, identity: { enabled: false } } })),
    );
    await flush();
    expect(result.current.signal).toBeNull();
    expect(result.current.reactions).toEqual({});
  });

  it('no tip is emitted while the welcome is up', async () => {
    readGuestPass.mockReturnValue(null);
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    scrollTo('snacks');
    expect(result.current.signal).toBe('welcome');

    act(() => vi.advanceTimersByTime(WELCOME_MS));
    scrollTo('snacks');
    expect(result.current.signal).toBe('tip:snacks');
    expect(result.current.reactions['tip:snacks'].message!.text).toMatch(/peri peri fries/);
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'tip_shown' });
  });

  it('each category tip fires at most once', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    scrollTo('snacks');
    expect(result.current.signal).toBe('tip:snacks');
    scrollTo('drinks');
    expect(result.current.signal).toBe('tip:drinks');
    scrollTo('snacks');
    expect(result.current.signal).toBe('tip:drinks');
    expect(recordEvent.mock.calls.filter(([e]) => e.kind === 'tip_shown')).toHaveLength(2);
  });

  it('no tips once something is in the cart', async () => {
    window.sessionStorage.setItem(`caos_welcomed_${BIZ}`, '1');
    let cartCount = 0;
    const { result, rerender } = renderHook(() => useMenuMascot(options({ cartCount })));
    await flush();
    cartCount = 1;
    rerender();
    scrollTo('snacks');
    expect(result.current.signal).toBeNull();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('"Add" puts the usual in the cart', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha!', usualProductId: 'p-chai' });
    const addToCart = vi.fn();
    const { result } = renderHook(() => useMenuMascot(options({ addToCart })));
    await flush();
    act(() => result.current.onAction('add-usual'));
    expect(addToCart).toHaveBeenCalledWith(chai);
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'welcome_usual_added' });
  });

  it('"Not you?" forgets the pass and swaps to the generic welcome', async () => {
    readGuestPass.mockReturnValue('t.o.k');
    getWelcome.mockResolvedValue({ line: 'Welcome back, Asha!', usualProductId: 'p-chai' });
    const { result } = renderHook(() => useMenuMascot(options()));
    await flush();
    act(() => result.current.onAction('not-you'));
    expect(forgetGuestPass).toHaveBeenCalledWith(BIZ);
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'not_you_clicked' });
    expect(result.current.signal).toBe('welcome:generic');
    const generic = result.current.reactions['welcome:generic'].message!;
    expect(generic.text).toBe('Welcome to Chai Point!');
    expect(generic.actions).toBeUndefined();
    expect(result.current.reactions.welcome).toBeUndefined();
  });
});
