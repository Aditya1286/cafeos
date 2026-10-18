import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Starts every new page at the top. Without this a page opened from a button lower down another
 * page (for example "Start your 2-week trial" at the bottom of the landing page) opens scrolled
 * to the bottom. A link to a section (`/#features`) scrolls to that section instead. Only a change
 * of page counts, so searching, filtering or switching a tab never jumps the page.
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
