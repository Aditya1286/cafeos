// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLiteEngine } from '../src/mascot/lite/createLiteEngine';
import type { MascotEngine } from '../src/mascot/renderer';

// The light renderer's own bookkeeping. jsdom applies no CSS and runs no animations, so the
// `animationend` events a browser would send are dispatched by hand, from the element that
// animates, exactly as the browser would (they bubble up to the <svg>).

const liteDir = join(__dirname, '..', 'src', 'mascot', 'lite');

const animationEnd = (target: Element, animationName: string) => {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  target.dispatchEvent(event);
};

let engine: MascotEngine | null = null;
let container: HTMLElement;

const make = (reducedMotion = false) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  engine = createLiteEngine({
    container,
    scroll: { progress: 0, velocity: 0, updatedAt: 0 },
    reducedMotion,
    onContextChange: () => {},
  });
  const svg = container.querySelector('svg')!;
  return {
    engine,
    svg,
    enter: svg.querySelector('.caosl-enter')!,
    fig: svg.querySelector('.caosl-fig')!,
  };
};

afterEach(() => {
  engine?.dispose();
  engine = null;
  container?.remove();
});

describe('light renderer: entrance vs gestures', () => {
  it('the entrance and the body gestures animate different elements', () => {
    const { enter, fig } = make();
    expect(enter).not.toBeNull();
    expect(fig).not.toBeNull();
    expect(enter).not.toBe(fig);
    expect(enter.contains(fig)).toBe(true);
  });

  it('a gesture fired during the entrance does not cancel it, and both clear on their own end', () => {
    const { engine, svg, enter, fig } = make();
    expect(svg.hasAttribute('data-pending')).toBe(true);
    engine.startEntrance();
    // The menu welcome: entrance and a gesture in the same tick.
    engine.triggerGesture({ name: 'pop', nonce: 1 });
    expect(svg.hasAttribute('data-pending')).toBe(false);
    expect(svg.hasAttribute('data-in')).toBe(true);
    expect(svg.getAttribute('data-g')).toBe('pop');

    // The gesture ends first: the entrance is still playing.
    animationEnd(fig, 'caosl-g-pop');
    expect(svg.hasAttribute('data-g')).toBe(false);
    expect(svg.hasAttribute('data-in')).toBe(true);

    // The entrance ends on its own element and clears, so it can never replay.
    animationEnd(enter, 'caosl-in');
    expect(svg.hasAttribute('data-in')).toBe(false);
  });

  it('reduced motion: no entrance animation and no gestures, the figure just appears', () => {
    const { engine, svg } = make(true);
    engine.startEntrance();
    engine.triggerGesture({ name: 'wave', nonce: 1 });
    expect(svg.hasAttribute('data-pending')).toBe(false);
    expect(svg.hasAttribute('data-in')).toBe(false);
    expect(svg.hasAttribute('data-g')).toBe(false);
  });

  it('a repeated gesture nonce is ignored; band colour accepts only hex', () => {
    const { engine, svg } = make();
    engine.triggerGesture({ name: 'nod', nonce: 3 });
    animationEnd(svg.querySelector('.caosl-head')!, 'caosl-g-nod');
    engine.triggerGesture({ name: 'nod', nonce: 3 });
    expect(svg.hasAttribute('data-g')).toBe(false);
    engine.setBandColor('#7a8b3c');
    engine.setBandColor('red; background: url(x)');
    expect(svg.style.getPropertyValue('--caosl-band')).toBe('#7a8b3c');
  });
});

describe('light renderer stylesheet', () => {
  const css = readFileSync(join(liteDir, 'lite.css'), 'utf8');
  /** Every rule's selector together with the animation it sets (if any). */
  const animated = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map(([, selector, body]) => ({
      selector: selector.trim(),
      animation: /(?:^|;|\s)animation:\s*([^;]+)/.exec(body)?.[1].trim(),
    }))
    .filter((r) => r.animation && !r.selector.startsWith('@') && !/^\d|^from|^to/.test(r.selector));

  it('plays the entrance only on .caosl-enter', () => {
    const entrance = animated.filter((r) => r.animation!.startsWith('caosl-in '));
    expect(entrance.map((r) => r.selector)).toEqual(['.caosl[data-in] .caosl-enter']);
  });

  it('never animates .caosl-enter with a gesture (they would replace each other)', () => {
    const gestures = animated.filter((r) => r.animation!.startsWith('caosl-g-'));
    expect(gestures.length).toBe(7);
    for (const g of gestures) expect(g.selector).not.toMatch(/caosl-enter/);
  });
});
