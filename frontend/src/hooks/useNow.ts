import { useEffect, useState } from 'react';

/** The current time in ms, refreshed every `intervalMs` and as soon as the tab becomes visible again
 * (a laptop that slept or a tab that sat in the background shouldn't show stale waiting times).
 * One timer for a whole board, passed down as a prop, rather than one per ticket. */
export const useNow = (intervalMs: number): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
};
