import { FLOW, LAYOUT, PEEK } from './config';
import type { ScrollSnapshot } from './sections';
import type { PageFlow, PeekConfig } from './types';

// Where the mascot is on the page. Two ways of being placed:
//
//   flow : fixed to the viewport, gliding down it in an S-curve as the page scrolls top to bottom.
//   peek : anchored to a card in the document (so it scrolls natively with the card, no jitter),
//          popping up from behind the card's top edge. The card paints above the mascot layer,
//          which is what hides the mascot's lower part.
//
// This module owns the host element's position, mode and phase attributes. It never touches the
// 3D model or the brain: it reports peeks and travel speed through callbacks.

/** Height of the sticky navbar; the mascot's flow path and peeks stay below it. */
const NAV_CLEAR = 76;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Top-left of the mascot box for a path progress 0..1 inside `area` (viewport px): an S-curve
 * across the area's width while descending its height, keeping `insets` clear. Pure. */
export const flowPositionIn = (
  progress: number,
  area: Rect,
  size: number,
  insets: { top: number; bottom: number },
): Point => {
  const p = clamp(progress, 0, 1);
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  const centre = area.left + (width - size) / 2;
  const reach = Math.max(0, (width - size) / 2 - LAYOUT.margin);
  const s = Math.sin(Math.PI * 2 * FLOW.swings * p + FLOW.phase);
  const k = FLOW.edgeSharpness;
  const shaped = k > 0 ? Math.tanh(k * s) / Math.tanh(k) : s;
  const room = Math.max(0, height - insets.top - insets.bottom - size - LAYOUT.margin);
  const t = FLOW.topStart + (FLOW.bottomEnd - FLOW.topStart) * p;
  return { x: centre + reach * shaped, y: area.top + insets.top + room * t };
};

/** The landing page's path: the whole viewport, below the sticky navbar. Pure. */
export const flowPosition = (progress: number, vw: number, vh: number, size: number): Point =>
  flowPositionIn(progress, { top: 0, bottom: vh, left: 0, right: vw }, size, {
    top: NAV_CLEAR,
    bottom: 0,
  });

/** How much of the mascot box clears a card's top edge: less on small (phone-sized) mascots. */
export const peekVisible = (size: number, override?: number): number =>
  override ?? (size < PEEK.compactBelow ? PEEK.visibleCompact : PEEK.visible);

/** Top-left of the mascot box for a card rect. The box is placed so only `peekVisible(size)` of it
 * clears the card's top edge. Works in whatever coordinate space the rect is in. Pure. */
export const peekPlacement = (
  card: Rect,
  size: number,
  anchor: number,
  visible?: number,
): Point => {
  const width = card.right - card.left;
  const wanted = card.left + width * anchor - size / 2;
  const x =
    width <= size
      ? card.left + (width - size) / 2
      : clamp(wanted, card.left + 4, card.right - size - 4);
  return { x, y: card.top - size * peekVisible(size, visible) };
};

/** The part of the mascot box that actually shows above a card (viewport coords for a viewport
 * rect): the middle of its width, minus the canvas's empty top margin. Pure. */
export const peekHeadBox = (card: Rect, size: number, anchor: number, visible?: number): Rect => {
  const place = peekPlacement(card, size, anchor, visible);
  return {
    left: place.x + size * 0.2,
    right: place.x + size * 0.8,
    top: place.y + size * 0.12,
    bottom: card.top - 2,
  };
};

/** True when two rects overlap by more than the slack (px) on both axes. Pure. */
export const overlaps = (
  a: Rect,
  b: Rect,
  slackX: number = PEEK.overlapSlackX,
  slackY: number = PEEK.overlapSlackY,
): boolean =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > slackX &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > slackY;

interface SpotRect extends Rect {
  id: string;
  /** False while the card is still fading in: a mascot rising behind it would show through. */
  ready?: boolean;
}

/** Which card (if any) the mascot should be peeking from, given viewport rects. A new peek needs the
 * card's top comfortably inside the viewport (room above it for the mascot, below the navbar); an
 * active one is kept until it is clearly leaving. Pure. */
export const pickPeek = (
  spots: SpotRect[],
  vh: number,
  size: number,
  active: string | null,
  isCooling: (id: string) => boolean = () => false,
  isBlocked: (id: string) => boolean = () => false,
  topInset: number = NAV_CLEAR,
  visible?: number,
): string | null => {
  const headroom = topInset + size * peekVisible(size, visible);
  if (active) {
    const current = spots.find((s) => s.id === active);
    if (
      current &&
      current.top >= topInset + size * 0.3 &&
      current.top <= vh * 0.94 &&
      current.bottom > 120
    ) {
      return active;
    }
  }
  for (const s of spots) {
    if (isCooling(s.id) || s.ready === false) continue;
    if (
      s.top >= headroom &&
      s.top <= vh * PEEK.maxTop &&
      s.bottom - s.top > size * 0.8 &&
      !isBlocked(s.id)
    ) {
      return s.id;
    }
  }
  return null;
};

/** Positions along a card's top edge to try, in order, when the preferred one is taken. */
const FALLBACK_ANCHORS = [0.92, 0.08, 0.5] as const;

/** The first anchor (preferred, then the fallbacks) whose head box overlaps none of `obstacles`, or
 * null when the whole top edge is taken. Pure. */
export const firstClearAnchor = (
  card: Rect,
  size: number,
  preferred: number,
  obstacles: Rect[],
  visible?: number,
): number | null => {
  for (const anchor of [preferred, ...FALLBACK_ANCHORS]) {
    const box = peekHeadBox(card, size, anchor, visible);
    if (!obstacles.some((o) => overlaps(box, o))) return anchor;
  }
  return null;
};

/** Document-space top-left for the mascot box inside a reserved slot: at the slot's left edge,
 * centred vertically, so it scrolls natively with the page. `rect` is viewport-relative; `scroll`
 * is the current page scroll. Pure. */
export const slotPlacement = (
  rect: Rect,
  size: number,
  scroll: { x: number; y: number },
): Point => ({
  x: rect.left + scroll.x,
  y: rect.top + scroll.y + Math.max(0, (rect.bottom - rect.top - size) / 2),
});

/** Whether any part of a viewport-relative rect is on screen. Pure. */
export const isOnScreen = (rect: Rect, viewportHeight: number): boolean =>
  rect.bottom > 0 && rect.top < viewportHeight;

type Phase = 'flow' | 'out' | 'rise' | 'peek' | 'sink' | 'in';

interface FlowOptions {
  host: HTMLElement;
  peeks: PeekConfig[];
  scroll: ScrollSnapshot;
  getSize: () => number;
  /** A card pop-up started (id) or ended (null). Fires once the mascot is visibly rising. */
  onPeek: (id: string | null) => void;
  /** Horizontal travel speed in px/s while gliding; 0 when still. */
  onVelocity: (vx: number) => void;
  /** The page's flow settings (area, insets, hold time, repeat). Defaults suit the landing page. */
  flow?: PageFlow;
  /** Reduced motion: rest in one corner of the area; no gliding, no peeking. */
  staticMode?: boolean;
  /** Slot mode: whether the mascot is on screen, so the renderer can pause while it isn't. */
  onVisible?: (visible: boolean) => void;
}

export interface FlowController {
  /** Re-evaluate position and peek state. Call on every (coalesced) scroll/resize frame. */
  update(): void;
  dispose(): void;
}

export const createFlowController = ({
  host,
  peeks,
  scroll,
  getSize,
  onPeek,
  onVelocity,
  flow,
  staticMode = false,
  onVisible,
}: FlowOptions): FlowController => {
  let lastVisible: boolean | null = null;
  const insets = { top: flow?.insets?.top ?? NAV_CLEAR, bottom: flow?.insets?.bottom ?? 0 };
  const repeatMs = flow?.peekRepeatMs ?? PEEK.repeatMs;
  const visibleOverride = flow?.peekVisible;
  let phase: Phase = 'flow';
  let activeId: string | null = null;
  let disposed = false;
  let raf = 0;
  let lastFrame = 0;
  const pos: Point = { x: 0, y: 0 };
  let target: Point = { x: 0, y: 0 };
  let placed = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const lastPeeked = new Map<string, number>();
  const elements = new Map<string, Element | null>();
  const anchorCache = new Map<string, { key: string; anchor: number | null }>();

  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
  };

  const viewport = () => ({
    vw: document.documentElement.clientWidth,
    vh: window.innerHeight,
  });

  const setPhase = (next: Phase) => {
    phase = next;
    host.dataset.phase = next;
  };

  const setBubbleSide = (centreX: number, topY: number, vw: number) => {
    const h = centreX < vw / 2 ? 'left' : 'right';
    const v = topY < insets.top + 70 ? 'below' : 'above';
    if (host.dataset.bx !== h) host.dataset.bx = h;
    if (host.dataset.by !== v) host.dataset.by = v;
  };

  const place = (x: number, y: number) => {
    host.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  /** The area the mascot may glide in: the page's bounds element, or the whole viewport. Null when
   * the page names a bounds element that is missing or hidden (the mascot is parked). */
  const flowArea = (): Rect | null => {
    const { vw, vh } = viewport();
    if (!flow?.bounds) return { top: 0, bottom: vh, left: 0, right: vw };
    const el = document.querySelector(flow.bounds);
    const r = el?.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) return null;
    // The mascot is fixed to the viewport, so only the part of the area that is on screen counts.
    const area = {
      top: Math.max(r.top, 0),
      bottom: Math.min(r.bottom, vh),
      left: Math.max(r.left, 0),
      right: Math.min(r.right, vw),
    };
    return area.bottom > area.top && area.right > area.left ? area : null;
  };

  const flowTarget = (): Point | null => {
    const area = flowArea();
    if (!area) return null;
    const size = getSize();
    if (staticMode) {
      return {
        x: flow?.corner === 'left' ? area.left + LAYOUT.margin : area.right - size - LAYOUT.margin,
        y: area.bottom - insets.bottom - size - LAYOUT.margin,
      };
    }
    const t = flowPositionIn(scroll.progress, area, size, insets);
    return {
      x: clamp(t.x, area.left + LAYOUT.margin, area.right - size - LAYOUT.margin),
      y: t.y,
    };
  };

  /** Move the resting target; hide the mascot (parked) when there is nowhere for it to glide. */
  const retarget = (snap: boolean): boolean => {
    const next = flowTarget();
    if (!next) {
      host.dataset.parked = 'true';
      return false;
    }
    delete host.dataset.parked;
    target = next;
    if (snap) {
      pos.x = next.x;
      pos.y = next.y;
    }
    return true;
  };

  const applyFlow = () => {
    const { vw } = viewport();
    place(pos.x, pos.y);
    setBubbleSide(pos.x + getSize() / 2, pos.y, vw);
  };

  const loop = (t: number) => {
    raf = 0;
    if (disposed || phase !== 'flow') return;
    const dt = clamp((t - lastFrame) / 1000, 0.001, 0.05);
    lastFrame = t;
    const k = 1 - Math.exp(-FLOW.follow * dt);
    const dx = (target.x - pos.x) * k;
    const dy = (target.y - pos.y) * k;
    pos.x += dx;
    pos.y += dy;
    applyFlow();
    const moving = Math.abs(target.x - pos.x) > 0.4 || Math.abs(target.y - pos.y) > 0.4;
    onVelocity(moving ? dx / dt : 0);
    if (moving) raf = requestAnimationFrame(loop);
  };

  const kick = () => {
    if (raf || disposed || phase !== 'flow') return;
    lastFrame = performance.now();
    raf = requestAnimationFrame(loop);
  };

  // ── Peek ───────────────────────────────────────────────────────────────────────────────────
  const spotElement = (peek: PeekConfig): Element | null => {
    const cached = elements.get(peek.peekId);
    if (cached && cached.isConnected) return cached;
    const found = document.querySelector(peek.selector);
    elements.set(peek.peekId, found);
    return found;
  };

  /** Content that would end up under (or beside) the mascot's head if it popped up here. Text is
   * measured by its glyph extents, not its (often full-width) element box. */
  const OBSTACLES =
    'h1,h2,h3,h4,p,li,a,button,input,select,textarea,img,svg,span,label,[role="tab"],[data-mascot-peek],[data-mascot-obstacle]';

  const contentRect = (el: Element): Rect | null => {
    let box: DOMRect;
    if (/^(H[1-4]|P|LI|A|BUTTON)$/.test(el.tagName)) {
      const range = document.createRange();
      range.selectNodeContents(el);
      box = range.getBoundingClientRect();
    } else {
      box = el.getBoundingClientRect();
    }
    return box.width > 0 && box.height > 0
      ? { top: box.top, bottom: box.bottom, left: box.left, right: box.right }
      : null;
  };

  /** Where along the card's top edge the mascot can pop up without covering anything: the
   * configured spot if it is clear, else the first clear fallback, else null (no peek here). Stacked
   * cards (phones), headings and tab rows all count as "something". Relative positions don't change
   * while scrolling, so the answer is cached until the layout (viewport width, mascot size, card
   * width) changes. */
  const clearAnchor = (peek: PeekConfig, el: Element, rect: DOMRect): number | null => {
    const size = getSize();
    const key = `${viewport().vw}|${size}|${Math.round(rect.width)}`;
    const cached = anchorCache.get(peek.peekId);
    if (cached && cached.key === key) return cached.anchor;

    const obstacles: Rect[] = [];
    const scope = el.closest('section') ?? document.body;
    for (const other of scope.querySelectorAll(OBSTACLES)) {
      if (other === el || other.contains(el) || el.contains(other) || host.contains(other))
        continue;
      const r = contentRect(other);
      if (r) obstacles.push(r);
    }
    const anchor = firstClearAnchor(
      { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
      size,
      peek.anchor,
      obstacles,
      visibleOverride,
    );
    anchorCache.set(peek.peekId, { key, anchor });
    return anchor;
  };

  const allowedHere = (peek: PeekConfig): boolean => {
    const { vw } = viewport();
    return (
      (peek.maxViewportWidth === undefined || vw <= peek.maxViewportWidth) &&
      (peek.minViewportWidth === undefined || vw >= peek.minViewportWidth)
    );
  };

  const measureSpots = (): SpotRect[] => {
    const out: SpotRect[] = [];
    for (const peek of peeks) {
      if (!allowedHere(peek)) continue;
      const el = spotElement(peek);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const ready = parseFloat(getComputedStyle(el).opacity) >= 0.98;
      out.push({
        id: peek.peekId,
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        ready,
      });
    }
    return out;
  };

  /** Document-space placement of the box for the active peek, from the card's current rect. */
  const peekPoint = (id: string): Point | null => {
    const peek = peeks.find((p) => p.peekId === id);
    const el = peek && spotElement(peek);
    if (!peek || !el) return null;
    const r = el.getBoundingClientRect();
    return peekPlacement(
      {
        top: r.top + window.scrollY,
        bottom: r.bottom + window.scrollY,
        left: r.left + window.scrollX,
        right: r.right + window.scrollX,
      },
      getSize(),
      anchorCache.get(peek.peekId)?.anchor ?? peek.anchor,
      visibleOverride,
    );
  };

  const startPeek = (id: string) => {
    activeId = id;
    lastPeeked.set(id, performance.now());
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    onVelocity(0);

    // 1. Fade out where it is.
    setPhase('out');
    later(PEEK.fadeMs, () => {
      if (activeId !== id) return; // cancelled while fading out; finishPeek already rejoined
      const point = peekPoint(id);
      if (!point) {
        finishPeek();
        return;
      }
      // 2. Reappear hidden behind the card (document-anchored), then rise.
      delete host.dataset.parked;
      host.dataset.mode = 'doc';
      host.dataset.body = 'hidden';
      place(point.x, point.y);
      setBubbleSide(point.x + getSize() / 2, point.y, viewport().vw);
      void host.offsetWidth; // commit the hidden pose before the transition starts
      setPhase('rise');
      host.dataset.body = 'up';
      later(PEEK.greetDelayMs, () => {
        if (activeId === id) onPeek(id);
      });
      later(PEEK.riseMs, () => {
        if (phase === 'rise') setPhase('peek');
      });
      if (flow?.peekHoldMs !== undefined) {
        later(PEEK.riseMs + flow.peekHoldMs, () => {
          if (activeId === id && (phase === 'rise' || phase === 'peek')) finishPeek();
        });
      }
    });
  };

  /** Sink behind the card, then rejoin the flow with a small pop-in. */
  const finishPeek = () => {
    const wasPeeking = phase === 'rise' || phase === 'peek';
    activeId = null;
    onPeek(null);
    const rejoin = () => {
      host.dataset.mode = 'fixed';
      host.dataset.body = 'up';
      retarget(true);
      applyFlow();
      setPhase('in');
      later(PEEK.fadeMs + 60, () => {
        setPhase('flow');
        kick();
        // A card may have come into view while the mascot was sinking/rejoining, and no scroll
        // event is coming to tell us: look again now.
        update();
      });
    };
    if (wasPeeking) {
      setPhase('sink');
      host.dataset.body = 'down';
      later(PEEK.sinkMs, () => {
        // Fade the last sliver away, rejoin invisibly, then fade back in.
        host.dataset.phase = 'out';
        later(PEEK.fadeMs, rejoin);
      });
    } else {
      rejoin();
    }
  };

  // ── Per-frame evaluation ──────────────────────────────────────────────────────────────────
  const update = () => {
    if (disposed) return;
    const { vh } = viewport();
    const size = getSize();

    if (!placed) {
      retarget(true);
      host.dataset.mode = 'fixed';
      host.dataset.body = 'up';
      setPhase('flow');
      applyFlow();
      placed = true;
    }

    if (flow?.mode === 'slot') {
      // Lives in a reserved spot in the page: document-anchored (scrolls natively), message beside it.
      const slot = flow.slot ? document.querySelector(flow.slot) : null;
      if (!slot) {
        host.dataset.parked = 'true';
        return;
      }
      const r = slot.getBoundingClientRect();
      const rect = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      delete host.dataset.parked;
      host.dataset.mode = 'doc';
      host.dataset.slot = 'true';
      host.dataset.body = 'up';
      host.style.setProperty('--slot-w', `${Math.round(r.width)}px`);
      const p = slotPlacement(rect, size, { x: window.scrollX, y: window.scrollY });
      place(p.x, p.y);
      const visible = isOnScreen(rect, vh);
      if (visible !== lastVisible) {
        lastVisible = visible;
        onVisible?.(visible);
      }
      return;
    }

    if (staticMode) {
      // Reduced motion: one resting spot, re-measured on resize. No path, no peeking.
      if (retarget(true)) applyFlow();
      return;
    }

    const spots = measureSpots();
    const wanted = pickPeek(
      spots,
      vh,
      size,
      activeId,
      (id) => {
        const last = lastPeeked.get(id);
        return last !== undefined && performance.now() - last < repeatMs;
      },
      (id) => {
        const peek = peeks.find((p) => p.peekId === id);
        const el = peek && spotElement(peek);
        return !peek || !el ? true : clearAnchor(peek, el, el.getBoundingClientRect()) === null;
      },
      NAV_CLEAR,
      visibleOverride,
    );

    if (phase === 'flow') {
      if (wanted) {
        startPeek(wanted);
        return;
      }
      retarget(false);
      kick();
    } else if ((phase === 'out' || phase === 'rise' || phase === 'peek') && wanted !== activeId) {
      finishPeek();
    } else if (phase === 'peek' && activeId) {
      // Card moved (resize, layout change): re-anchor.
      const point = peekPoint(activeId);
      if (point) place(point.x, point.y);
    }
  };

  return {
    update,
    dispose: () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      elements.clear();
      anchorCache.clear();
      onVelocity(0);
    },
  };
};
