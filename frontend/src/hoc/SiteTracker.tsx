import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MARKETING_PATHS, trackSiteEvent } from '@/utils/siteTracking';

/** Counts a page view each time a marketing page opens (see utils/siteTracking). Renders nothing. */
export const SiteTracker = () => {
  const { pathname } = useLocation();
  // React's development mode runs effects twice; this keeps that from counting one view as two.
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    if (MARKETING_PATHS.includes(pathname)) trackSiteEvent('pageview');
  }, [pathname]);

  return null;
};

export default SiteTracker;
