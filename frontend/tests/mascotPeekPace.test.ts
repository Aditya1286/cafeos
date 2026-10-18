// @vitest-environment jsdom
// Pop-ups that follow the page's scrolling (the café menu): none while the page is moving fast, a rise
// whose pace follows the scroll speed once it slows down, a quick sink when the visitor flicks away.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PEEK_PACE } from '../src/mascot/config';
import { createFlowController, peekPace } from '../src/mascot/flow';

describe('peekPace', () => {
  it('only lets a pop-up start while the page is scrolling slowly', () => {
    expect(peekPace(0).canRise).toBe(true);
    expect(peekPace(PEEK_PACE.startBelow - 0.01).canRise).toBe(true);
    expect(peekPace(PEEK_PACE.startBelow).canRise).toBe(false);
    expect(peekPace(3).canRise).toBe(false);
  });

  it('rises slowest when the page is still, and quicker as the scroll nears the limit', () => {
    expect(peekPace(0).riseMs).toBe(PEEK_PACE.riseMs.still);
    expect(peekPace(PEEK_PACE.startBelow).riseMs).toBe(PEEK_PACE.riseMs.limit);
    const slow = peekPace(0.1).riseMs;
    const brisk = peekPace(0.3).riseMs;
    expect(slow).toBeGreaterThan(brisk);
    expect(slow).toBeLessThan(PEEK_PACE.riseMs.still);
    expect(brisk).toBeGreaterThan(PEEK_PACE.riseMs.limit);
  });

  it('sinks unhurriedly when the visitor stops, and quickly when they flick past', () => {
    expect(peekPace(0).sinkMs).toBe(PEEK_PACE.sinkMs.calm);
    expect(peekPace(PEEK_PACE.startBelow).sinkMs).toBe(PEEK_PACE.sinkMs.calm);
    expect(peekPace(PEEK_PACE.fastAbove).sinkMs).toBe(PEEK_PACE.sinkMs.fast);
    expect(peekPace(10).sinkMs).toBe(PEEK_PACE.sinkMs.fast);
  });

  it('is never slower than the calm pace, and never quicker than the fast one', () => {
    for (let speed = 0; speed <= 5; speed += 0.05) {
      const { riseMs, sinkMs } = peekPace(speed);
      expect(riseMs).toBeLessThanOrEqual(PEEK_PACE.riseMs.still);
      expect(riseMs).toBeGreaterThanOrEqual(PEEK_PACE.riseMs.limit);
      expect(sinkMs).toBeLessThanOrEqual(PEEK_PACE.sinkMs.calm);
      expect(sinkMs).toBeGreaterThanOrEqual(PEEK_PACE.sinkMs.fast);
    }
  });
});

describe('the flow controller in peek mode', () => {
  let clock = 0;
  let scrollY = 0;
  let cardTopAtRest = 0;
  let host: HTMLElement;
  let card: HTMLElement;
  let onPeek: ReturnType<typeof vi.fn>;

  const tick = (ms: number) => {
    clock += ms;
    vi.advanceTimersByTime(ms);
  };

  /** The category's top bar scrolls with the page: its top edge is `cardTopAtRest` minus the scroll. */
  const placeCard = () => {
    const top = cardTopAtRest - scrollY;
    card.getBoundingClientRect = () =>
      ({
        top,
        bottom: top + 70,
        left: 16,
        right: 374,
        width: 358,
        height: 70,
        x: 16,
        y: top,
      }) as DOMRect;
  };

  /** Scrolls at `pxPerMs` for `ms`, one frame (16ms) at a time, updating the controller each frame. */
  const scroll = (controller: { update: () => void }, pxPerMs: number, ms: number) => {
    for (let spent = 0; spent < ms; spent += 16) {
      scrollY += pxPerMs * 16;
      placeCard();
      tick(16);
      controller.update();
    }
  };

  const make = () =>
    createFlowController({
      host,
      peeks: [
        {
          peekId: 'tip:coffee',
          selector: '[data-mascot-peek="tip:coffee"]',
          anchor: 0.9,
          greet: {},
        },
      ],
      scroll: { progress: 0, velocity: 0, updatedAt: 0 },
      getSize: () => 64,
      onPeek: onPeek as unknown as (id: string | null) => void,
      onVelocity: () => {},
      flow: { mode: 'peek' },
    });

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 1000;
    scrollY = 0;
    cardTopAtRest = 1200; // well below the screen: it scrolls into view
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 390,
    });
    document.body.innerHTML =
      '<section><button data-mascot-peek="tip:coffee" style="opacity:1">Coffee (4)</button></section>';
    card = document.querySelector('[data-mascot-peek]') as HTMLElement;
    placeCard();
    host = document.createElement('div');
    document.body.appendChild(host);
    onPeek = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is calm and not on screen between pop-ups', () => {
    const controller = make();
    controller.update();
    expect(host.dataset.calm).toBe('true');
    expect(host.dataset.parked).toBe('true');
    controller.dispose();
  });

  it('holds a pop-up back while the page is being scrolled fast, even with a card in view', () => {
    const controller = make();
    controller.update();
    scroll(controller, 2, 480); // 2 px/ms (2,000 px/s): the card passes through the middle of the screen
    expect(card.getBoundingClientRect().top).toBeLessThan(400);
    expect(host.dataset.phase).toBe('flow');
    expect(host.style.getPropertyValue('--m-rise-ms')).toBe('');
    expect(onPeek).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('does not start a pop-up on the first frame of a flick', () => {
    cardTopAtRest = 400; // already in view when the flick starts
    const controller = make();
    scrollY = 40; // the page has only just started to move: one sample, speed not known yet
    placeCard();
    tick(16);
    controller.update();
    expect(host.dataset.phase).toBe('flow');
    controller.dispose();
  });

  it('rises on its own once the page has settled, slowly because the page is still', () => {
    const controller = make();
    controller.update();
    scroll(controller, 2, 480); // flick, then let go
    tick(PEEK_PACE.settleMs + 400); // the settle check fires and the mascot fades in behind the card
    expect(host.dataset.phase).toBe('rise');
    expect(host.style.getPropertyValue('--m-rise-ms')).toBe(`${PEEK_PACE.riseMs.still}ms`);
    // It greets once it is mostly up, not the moment it starts rising.
    expect(onPeek).not.toHaveBeenCalled();
    tick(PEEK_PACE.riseMs.still);
    expect(onPeek).toHaveBeenCalledWith('tip:coffee');
    expect(host.dataset.phase).toBe('peek');
    controller.dispose();
  });

  it('rises a little quicker when the page is still moving, but slowly enough to read', () => {
    cardTopAtRest = 700;
    const controller = make();
    controller.update();
    scroll(controller, 0.25, 640); // 250 px/s, a steady read: the card enters the pop-up band on the way
    expect(host.dataset.phase).toBe('rise');
    const riseMs = parseInt(host.style.getPropertyValue('--m-rise-ms'), 10);
    expect(riseMs).toBeLessThan(PEEK_PACE.riseMs.still);
    expect(riseMs).toBeGreaterThan(PEEK_PACE.riseMs.limit);
    controller.dispose();
  });

  it('sinks quickly when the visitor flicks away from it', () => {
    cardTopAtRest = 450; // in view, with the page still: it rises slowly
    placeCard();
    const controller = make();
    controller.update();
    tick(PEEK_PACE.riseMs.still + 200);
    expect(host.dataset.phase).toBe('peek');

    scroll(controller, 2, 400); // flick the card off the top of the screen
    expect(host.style.getPropertyValue('--m-sink-ms')).toBe(`${PEEK_PACE.sinkMs.fast}ms`);
    controller.dispose();
  });

  it('tells the page when it has gone back behind the card', () => {
    cardTopAtRest = 450;
    placeCard();
    const controller = make();
    controller.update();
    tick(PEEK_PACE.riseMs.still + 200);
    expect(onPeek).toHaveBeenCalledWith('tip:coffee');
    onPeek.mockClear();
    scroll(controller, 2, 400);
    expect(onPeek).toHaveBeenCalledWith(null);
    controller.dispose();
  });
});
