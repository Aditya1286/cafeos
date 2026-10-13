import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MascotBrain } from '../src/mascot/brain';
import {
  LANDING_CONFIG,
  LOGIN_CONFIG,
  ORDER_CONFIG,
  TIMING,
  validateConfig,
} from '../src/mascot/config';
import type { MascotConfig } from '../src/mascot/types';

const make = (config: MascotConfig = LANDING_CONFIG) => new MascotBrain(config);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('mascot brain: sections', () => {
  it('starts idle with no message', () => {
    const s = make().getState();
    expect(s.expression).toBe('idle');
    expect(s.message).toBeNull();
    expect(s.source).toBe('idle');
  });

  it('selects the configured reaction when a section is entered', () => {
    const brain = make();
    expect(brain.enterSection('pricing')).toBe(true);
    const s = brain.getState();
    expect(s.sectionId).toBe('pricing');
    expect(s.expression).toBe('curious');
    expect(s.message?.id).toBe('pricing.enter');
    expect(s.gesture?.name).toBe('lean');
  });

  it('ignores unknown sections without throwing or changing state', () => {
    const brain = make();
    brain.enterSection('hero');
    const before = brain.getState();
    expect(brain.enterSection('nope')).toBe(false);
    expect(brain.hoverTarget('nope')).toBe(false);
    expect(brain.focusTarget('nope')).toBe(false);
    expect(brain.getState()).toBe(before);
  });

  it('drops the previous section message immediately on a fast transition (no stale message)', () => {
    const brain = make();
    brain.enterSection('features');
    brain.enterSection('stats');
    brain.enterSection('why');
    brain.enterSection('pricing');
    expect(brain.getState().message?.id).toBe('pricing.enter');
    // A section with no message must not inherit the last one's text.
    const cfg: MascotConfig = {
      sections: [
        { sectionId: 'a', selector: '#a', enter: { message: { id: 'a', text: 'A' } } },
        { sectionId: 'b', selector: '#b', enter: { expression: 'curious' } },
      ],
      targets: [],
      peeks: [],
    };
    const b = make(cfg);
    b.enterSection('a');
    b.enterSection('b');
    expect(b.getState().message).toBeNull();
  });

  it('expires the message after its duration but keeps the expression', () => {
    const brain = make();
    brain.enterSection('pricing');
    vi.advanceTimersByTime(TIMING.messageMs + 10);
    const s = brain.getState();
    expect(s.message).toBeNull();
    expect(s.expression).toBe('curious');
  });

  it('suppresses a repeated section message inside its cooldown', () => {
    const brain = make();
    brain.enterSection('faq');
    expect(brain.getState().message?.id).toBe('faq.enter');
    vi.advanceTimersByTime(TIMING.messageMs + 10);
    brain.enterSection('pricing');
    brain.enterSection('faq');
    expect(brain.getState().message).toBeNull();
    // After the cooldown it speaks again.
    vi.advanceTimersByTime(30_000);
    brain.enterSection('pricing');
    brain.enterSection('faq');
    expect(brain.getState().message?.id).toBe('faq.enter');
  });

  it('clearSection returns to idle', () => {
    const brain = make();
    brain.enterSection('pricing');
    brain.clearSection();
    expect(brain.getState().expression).toBe('idle');
    expect(brain.getState().message).toBeNull();
  });
});

describe('mascot brain: hover, focus and priority', () => {
  it('pricing-card hover supersedes the pricing section message', () => {
    const brain = make();
    brain.enterSection('pricing');
    brain.hoverTarget('pricing-popular');
    const s = brain.getState();
    expect(s.source).toBe('hover');
    expect(s.message?.id).toBe('pricing-popular.hover');
    expect(s.expression).toBe('confident');
  });

  it('restores the section state, and its unexpired message, when the hover ends', () => {
    const brain = make();
    brain.enterSection('pricing');
    vi.advanceTimersByTime(1_000);
    brain.hoverTarget('pricing-plan');
    brain.releaseHover('pricing-plan');
    const s = brain.getState();
    expect(s.source).toBe('section');
    expect(s.expression).toBe('curious');
    expect(s.message?.id).toBe('pricing.enter');
  });

  it('does not bring back a section message that already timed out', () => {
    const brain = make();
    brain.enterSection('pricing');
    vi.advanceTimersByTime(TIMING.messageMs + 10);
    brain.hoverTarget('pricing-plan');
    brain.releaseHover();
    expect(brain.getState().message).toBeNull();
  });

  it('keeps hover on top when a section is entered mid-hover, then shows the new section after', () => {
    const brain = make();
    brain.enterSection('features');
    brain.hoverTarget('tour-step');
    brain.enterSection('stats'); // scrolled while hovering
    expect(brain.getState().source).toBe('hover');
    brain.releaseHover();
    const s = brain.getState();
    expect(s.source).toBe('section');
    expect(s.sectionId).toBe('stats');
    expect(s.message?.id).toBe('stats.enter');
  });

  it('lets higher priority win and equal priority go to the more direct trigger', () => {
    const brain = make();
    brain.enterSection('hero');
    brain.hoverTarget('hero-cta');
    brain.focusTarget('hero-demo'); // focus (6) outranks hover (5)
    expect(brain.getState().message?.id).toBe('hero-demo.focus');
    brain.releaseFocus();
    expect(brain.getState().message?.id).toBe('hero-cta.hover');
  });

  it('a section priority above hover blocks the hover (explicit priority is respected)', () => {
    const cfg: MascotConfig = {
      sections: [
        {
          sectionId: 's',
          selector: '#s',
          enter: { priority: 9, expression: 'excited', message: { id: 's', text: 'S' } },
        },
      ],
      peeks: [],
      targets: [
        {
          targetId: 't',
          selector: '#t',
          hover: { expression: 'curious', message: { id: 't', text: 'T' } },
        },
      ],
    };
    const brain = make(cfg);
    brain.enterSection('s');
    brain.hoverTarget('t');
    expect(brain.getState().expression).toBe('excited');
    expect(brain.getState().message?.id).toBe('s');
  });

  it('suppresses a repeated hover message and its gesture on rapid re-hover', () => {
    const brain = make();
    brain.hoverTarget('pricing-plan');
    const first = brain.getState().gesture;
    expect(brain.getState().message?.id).toBe('pricing-plan.hover');
    brain.releaseHover();
    brain.hoverTarget('pricing-plan');
    expect(brain.getState().message).toBeNull();
    expect(brain.getState().gesture).toBe(first); // no new nod
  });

  it('releaseHover for a stale target id is a no-op', () => {
    const brain = make();
    brain.hoverTarget('pricing-plan');
    brain.hoverTarget('pricing-popular');
    brain.releaseHover('pricing-plan'); // late release of the old target
    expect(brain.getState().source).toBe('hover');
    expect(brain.getState().message?.id).toBe('pricing-popular.hover');
  });

  it('a target with a gesture-only reaction changes expression without a message', () => {
    const brain = make();
    brain.hoverTarget('tour-step');
    const s = brain.getState();
    expect(s.expression).toBe('curious');
    expect(s.message).toBeNull();
    expect(s.gesture?.name).toBe('nod');
  });

  it('dismissMessage hides the bubble but keeps the expression', () => {
    const brain = make();
    brain.enterSection('hero');
    brain.dismissMessage();
    expect(brain.getState().message).toBeNull();
    expect(brain.getState().expression).toBe('confident');
  });

  it('notifies subscribers only on real changes and stops after unsubscribe/dispose', () => {
    const brain = make();
    const listener = vi.fn();
    const off = brain.subscribe(listener);
    brain.enterSection('hero');
    const calls = listener.mock.calls.length;
    brain.enterSection('hero'); // same section: nothing new
    expect(listener.mock.calls.length).toBe(calls);
    off();
    brain.enterSection('faq');
    expect(listener.mock.calls.length).toBe(calls);
    brain.dispose();
    expect(brain.enterSection('pricing')).toBe(false);
    // The expiry timer must not fire after dispose.
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('mascot brain: peeking from behind a card', () => {
  it('a peek greeting waves, speaks and outranks the section reaction', () => {
    const brain = make();
    brain.enterSection('why');
    brain.peek('why');
    const s = brain.getState();
    expect(s.source).toBe('peek');
    expect(s.gesture?.name).toBe('wave');
    expect(s.message?.id).toBe('why.hi');
    expect(s.expression).toBe('curious');
  });

  it('going back behind the card restores the section state', () => {
    const brain = make();
    brain.enterSection('why');
    vi.advanceTimersByTime(TIMING.messageMs + 10);
    brain.peek('why');
    brain.unpeek('why');
    expect(brain.getState().source).toBe('section');
    expect(brain.getState().sectionId).toBe('why');
  });

  it('hovering a target inside the card beats the greeting, then the greeting is back after', () => {
    const brain = make();
    brain.peek('pricing');
    brain.hoverTarget('pricing-popular');
    expect(brain.getState().message?.id).toBe('pricing-popular.hover');
    brain.releaseHover();
    expect(brain.getState().message?.id).toBe('pricing.hi');
  });

  it('the greeting text is not repeated within its cooldown, but the peek still works', () => {
    const brain = make();
    brain.peek('tour');
    expect(brain.getState().message?.id).toBe('tour.hi');
    vi.advanceTimersByTime(TIMING.messageMs + 10);
    brain.unpeek();
    vi.advanceTimersByTime(5_000);
    brain.peek('tour');
    expect(brain.getState().message).toBeNull();
    expect(brain.getState().source).toBe('peek');
  });

  it('ignores unknown peek ids and a stale unpeek', () => {
    const brain = make();
    expect(brain.peek('nope')).toBe(false);
    brain.peek('why');
    brain.unpeek('tour');
    expect(brain.getState().source).toBe('peek');
  });
});

describe('mascot brain: login page', () => {
  const login = () => new MascotBrain(LOGIN_CONFIG);

  it('covers its eyes (shy) while the password field has focus, and recovers after', () => {
    const brain = login();
    brain.enterSection('login');
    brain.focusTarget('login-password');
    expect(brain.getState().expression).toBe('shy');
    expect(brain.getState().message?.id).toBe('login-password.focus');
    brain.releaseFocus('login-password');
    expect(brain.getState().expression).toBe('confident');
  });

  it('greets from behind the stage card, then the form card, each with its own message', () => {
    const brain = login();
    brain.peek('login-stage');
    expect(brain.getState().message?.id).toBe('login-stage.hi');
    brain.unpeek('login-stage');
    brain.peek('login-form');
    expect(brain.getState().message?.id).toBe('login-form.hi');
    expect(brain.getState().gesture?.name).toBe('wave');
  });

  it('the submit button gets an excited reaction on hover and focus', () => {
    const brain = login();
    brain.hoverTarget('login-submit');
    expect(brain.getState().expression).toBe('excited');
    brain.releaseHover();
    brain.focusTarget('login-submit');
    expect(brain.getState().expression).toBe('excited');
  });

  it('typing in the password field outranks a hover on the demo button', () => {
    const brain = login();
    brain.hoverTarget('login-demo');
    brain.focusTarget('login-password');
    expect(brain.getState().expression).toBe('shy');
  });
});

describe('mascot brain: order signals', () => {
  const order = () => new MascotBrain(ORDER_CONFIG);

  it('speaks when the order status changes, and again when it drifts into a long wait', () => {
    const brain = order();
    brain.setSignal('placed');
    expect(brain.getState().message?.id).toBe('order.placed');
    brain.setSignal('wait-long');
    expect(brain.getState().message?.id).toBe('order.wait-long');
    expect(brain.getState().expression).toBe('confident');
    brain.setSignal('wait-longer');
    expect(brain.getState().message?.id).toBe('order.wait-longer');
  });

  it('setting the signal it already has does not repeat it', () => {
    const brain = order();
    brain.setSignal('ready');
    const first = brain.getState();
    brain.setSignal('ready');
    expect(brain.getState()).toBe(first);
  });

  it('a status message stays until the status changes (it is a caption, not a toast)', () => {
    const brain = order();
    brain.setSignal('wait-long');
    vi.advanceTimersByTime(10 * 60_000);
    expect(brain.getState().message?.id).toBe('order.wait-long');
    expect(vi.getTimerCount()).toBe(0); // an unbounded message sets no expiry timer
    brain.setSignal('ready');
    expect(brain.getState().message?.id).toBe('order.ready');
  });

  it('a signal can repeat after something else, and ignores unknown keys and clearing', () => {
    const brain = order();
    brain.setSignal('placed');
    brain.setSignal('preparing');
    brain.setSignal('placed');
    expect(brain.getState().message?.id).toBe('order.placed');
    expect(brain.setSignal('nonsense')).toBe(false);
    brain.setSignal(null);
    expect(brain.getState().expression).toBe('idle');
  });
});

describe('mascot config', () => {
  it('ships valid configs', () => {
    expect(validateConfig(LOGIN_CONFIG)).toEqual([]);
    expect(validateConfig(LANDING_CONFIG)).toEqual([]);
  });

  it('reports duplicates and malformed entries instead of throwing', () => {
    const problems = validateConfig({
      sections: [
        { sectionId: 'x', selector: '#x', enter: { message: { id: 'm', text: 'a' } } },
        { sectionId: 'x', selector: '#y', enter: { message: { id: 'm', text: ' ' } } },
      ],
      targets: [{ targetId: '', selector: '' }],
      peeks: [{ peekId: 'p', selector: '#p', anchor: 2, greet: {} }],
    });
    expect(problems.length).toBeGreaterThanOrEqual(3);
    expect(problems.join('\n')).toMatch(/duplicate sectionId/);
    expect(problems.join('\n')).toMatch(/non-empty id and text/);
    expect(problems.join('\n')).toMatch(/anchor must be 0..1/);
  });

  it('never promises savings, profit or guarantees in mascot copy', () => {
    const texts = [
      ...LANDING_CONFIG.sections.map((s) => s.enter?.message?.text),
      ...LANDING_CONFIG.targets.flatMap((t) => [t.hover?.message?.text, t.focus?.message?.text]),
    ].filter((t): t is string => !!t);
    expect(texts.length).toBeGreaterThan(8);
    for (const text of texts) expect(text).not.toMatch(/guarantee|save \d|%|₹\d|profit|earn/i);
  });
});
