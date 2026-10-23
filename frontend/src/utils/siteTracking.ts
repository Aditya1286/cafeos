import siteAnalyticsService from '@/services/public/siteAnalytics';
import { SiteEventType } from '@/services/public/siteAnalytics/types';
import { getAuthToken } from '@/services/api';
import { getSessionId, getVisitSource, getVisitorId } from './siteVisitor';

/** The marketing site's pages; the apps behind a login and the cafés' own menus are not "the website". */
export const MARKETING_PATHS = [
  '/',
  '/request-demo',
  '/terms',
  '/privacy',
  '/login',
  '/register',
  '/forgot-password',
];

/**
 * Reports one event to the site's own analytics. Signed-in users (café staff, our own team) are
 * skipped so the numbers are about prospects, not about us.
 */
export const trackSiteEvent = (
  type: SiteEventType,
  extra: { step?: string; stepIndex?: number; value?: string } = {},
): void => {
  if (getAuthToken()) return;
  const source = getVisitSource();
  siteAnalyticsService.track({
    type,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    path: window.location.pathname,
    referrer: source.referrer,
    utmSource: source.utmSource,
    utmMedium: source.utmMedium,
    utmCampaign: source.utmCampaign,
    ...extra,
  });
};
