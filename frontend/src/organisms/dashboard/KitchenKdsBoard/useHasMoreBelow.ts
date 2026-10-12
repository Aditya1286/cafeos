import { useLayoutEffect, useRef, useState } from 'react';

/** Whether a scrollable element has content below what is showing. Used to cue that a fixed-height
 * ticket has more items than fit, so nothing is ever silently out of sight. Re-checks on scroll, on
 * resize, and whenever `deps` change. */
export const useHasMoreBelow = <T extends HTMLElement>(deps: readonly unknown[]) => {
  const ref = useRef<T>(null);
  const [more, setMore] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller names what should re-check
  }, deps);

  return { ref, more };
};
