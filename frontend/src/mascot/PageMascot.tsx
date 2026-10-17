import React, { Component, Suspense, lazy, useEffect, useState } from 'react';
import type { MascotPageProps, PageId } from './types';

// The only entry point to the mascot. The landing and login pages render this and nothing else does,
// which keeps the mascot (and three.js) off every other route: no other page imports this file, so
// the chunk is never even requested elsewhere. tests/mascotEngineLogic.test.ts enforces that.

const MascotExperience = lazy(() => import('./MascotExperience'));

/** A crash inside the mascot must never take the landing page down with it. */
class MascotBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[mascot] disabled after an error:', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Waits until the page itself has loaded and the browser is idle before fetching the mascot, so
 * the hero and its CTAs are never competing with it. */
const useWhenIdle = (): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const go = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => !cancelled && setReady(true), {
          timeout: 2500,
        });
      } else {
        timeout = setTimeout(() => !cancelled && setReady(true), 300);
      }
    };

    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', go);
      if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
      if (timeout) clearTimeout(timeout);
    };
  }, []);
  return ready;
};

/** The mascot for one page.
 * - `signal`: the page's own state to react to, a key of the config's `signals` or of `reactions`
 *   (e.g. the order's status on the order page).
 * - `rendering`: `heavy` (default, three.js) or `light` (a flat SVG; never downloads three.js).
 * - `reactions`: extra signals built from the page's data at runtime (the menu's welcome, tips).
 * - `dress`: a café theme's hat band and bubble colours.
 * - `onAction`: a button in the bubble was tapped (a message's `actions`).
 * `import type` is erased at build time, so the experience chunk still loads only lazily. */
export const PageMascot: React.FC<MascotPageProps & { page: PageId }> = (props) => {
  const ready = useWhenIdle();
  if (!ready) return null;
  return (
    <MascotBoundary>
      <Suspense fallback={null}>
        <MascotExperience {...props} />
      </Suspense>
    </MascotBoundary>
  );
};

export default PageMascot;
