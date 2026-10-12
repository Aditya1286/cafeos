import { ACTIVE_LINE } from './config';
import type { SectionConfig } from './types';

export interface SectionRect {
  id: string;
  top: number;
  bottom: number;
}

/** The section whose box contains the probe line (a fixed fraction down the viewport). When the
 * line falls between sections (navbar gap, footer) the previous section stays active, so the
 * mascot doesn't flip to idle on every gap. */
export const pickActiveSection = (
  rects: SectionRect[],
  viewportHeight: number,
  previous: string | null,
  line: number = ACTIVE_LINE,
): string | null => {
  const probe = viewportHeight * line;
  for (const rect of rects) {
    if (rect.top <= probe && probe < rect.bottom) return rect.id;
  }
  return previous;
};

/** Live scroll numbers the engine reads each frame. Mutated in place so nothing re-renders. */
export interface ScrollSnapshot {
  /** 0 at the top of the page, 1 at the bottom. */
  progress: number;
  /** Smoothed px/s, positive when scrolling down. */
  velocity: number;
  /** performance.now() of the last scroll event, so the engine can decay a stale velocity. */
  updatedAt: number;
}

export interface SectionTracker {
  scroll: ScrollSnapshot;
  /** Re-measure now (after layout changes that don't fire scroll/resize). */
  refresh(): void;
  dispose(): void;
}

interface TrackerOptions {
  sections: SectionConfig[];
  /** Updated in place; share it with whatever reads scroll motion (the engine). */
  scroll?: ScrollSnapshot;
  /** Write scroll progress into `scroll` (default true). Off for pages whose path follows form steps. */
  trackProgress?: boolean;
  /** Runs after every coalesced scroll/resize measurement (one shared listener, no second one). */
  onFrame?: () => void;
  onActiveChange: (sectionId: string | null) => void;
}

const VELOCITY_SMOOTHING = 0.25;

/** One passive scroll listener (+ resize, + body ResizeObserver), coalesced to one measurement per
 * animation frame. Owns nothing but its own listeners: dispose() removes all of them. */
export const createSectionTracker = ({
  sections,
  onActiveChange,
  onFrame,
  trackProgress = true,
  scroll = { progress: 0, velocity: 0, updatedAt: 0 },
}: TrackerOptions): SectionTracker => {
  const elements = new Map<string, Element | null>();
  let active: string | null = null;
  let frame = 0;
  let pendingScroll = false;
  let lastY = window.scrollY;
  let lastT = performance.now();
  let disposed = false;

  const resolve = (section: SectionConfig): Element | null => {
    const cached = elements.get(section.sectionId);
    if (cached && cached.isConnected) return cached;
    const found = document.querySelector(section.selector);
    elements.set(section.sectionId, found);
    return found;
  };

  const measure = () => {
    frame = 0;
    const fromScroll = pendingScroll;
    pendingScroll = false;
    if (disposed) return;

    const y = window.scrollY;
    const now = performance.now();
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (trackProgress) scroll.progress = Math.min(1, Math.max(0, y / maxScroll));
    if (fromScroll) {
      const dt = Math.max(1, now - lastT);
      const instant = ((y - lastY) / dt) * 1000;
      scroll.velocity += (instant - scroll.velocity) * VELOCITY_SMOOTHING;
      scroll.updatedAt = now;
    }
    lastY = y;
    lastT = now;

    const rects: SectionRect[] = [];
    for (const section of sections) {
      const el = resolve(section);
      if (!el) continue;
      const box = el.getBoundingClientRect();
      rects.push({ id: section.sectionId, top: box.top, bottom: box.bottom });
    }
    const next = pickActiveSection(rects, window.innerHeight, active);
    if (next !== active) {
      active = next;
      onActiveChange(next);
    }
    onFrame?.();
  };

  const schedule = (fromScroll: boolean) => {
    if (disposed) return;
    pendingScroll ||= fromScroll;
    if (!frame) frame = requestAnimationFrame(measure);
  };

  const onScroll = () => schedule(true);
  const onResize = () => schedule(false);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
  observer?.observe(document.body);

  measure();

  return {
    scroll,
    refresh: () => schedule(false),
    dispose: () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      elements.clear();
    },
  };
};
