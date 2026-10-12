import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the element named by the URL hash (e.g. `/#pricing`) whenever the hash changes,
 * including re-clicks on the same link. The browser's own anchor scroll doesn't work in this
 * single-page app: it runs before the page has rendered, and React Router's `<Link>` navigation
 * never triggers it. Pair with `scroll-mt-*` on the target so the sticky navbar doesn't cover it. */
export const useScrollToHash = () => {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key]);
};
