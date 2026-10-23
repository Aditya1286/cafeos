import { SITE_EVENT_TYPES, SiteDevice, SiteEventType } from '../models/SiteEvent';
import * as siteEventDao from '../dao/siteEvent.dao';
import * as demoRequestDao from '../dao/demoRequest.dao';
import { ServiceError } from '../utils/serviceError';

// First-party analytics for the marketing site: the browser reports page views and demo-quiz steps
// (frontend services/public/siteAnalytics), the Super Admin "Website" tab reads the report.

const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const STEP_RE = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const VALUE_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
const HOST_RE = /^[a-z0-9.-]{1,200}$/;
// Crawlers, link unfurlers and headless browsers that run scripts would otherwise count as visits.
const BOT_UA_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|python-requests|curl|wget/i;

const asString = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export const deviceFromUserAgent = (ua: string): SiteDevice => {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
};

const normalizeHost = (value: unknown): string | undefined => {
  const host = asString(value, 200)
    .toLowerCase()
    .replace(/^www\./, '');
  return host && HOST_RE.test(host) ? host : undefined;
};

/**
 * Stores one event from the browser. Bots are dropped quietly (false); malformed input is a 400 so a
 * broken client shows up in the network tab instead of silently recording nothing.
 */
export const recordEvent = async (input: Record<string, unknown>, userAgent: string): Promise<boolean> => {
  if (!userAgent || BOT_UA_RE.test(userAgent)) return false;

  const type = input.type as SiteEventType;
  const visitorId = asString(input.visitorId, 64);
  const sessionId = asString(input.sessionId, 64);
  const path = asString(input.path, 200).split(/[?#]/)[0];

  if (!SITE_EVENT_TYPES.includes(type) || !ID_RE.test(visitorId) || !ID_RE.test(sessionId) || !path.startsWith('/')) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Malformed analytics event.');
  }

  const isDemo = type !== 'pageview';
  const step = asString(input.step, 40);
  const value = asString(input.value, 60);
  const stepIndex =
    typeof input.stepIndex === 'number' && Number.isInteger(input.stepIndex) ? input.stepIndex : undefined;
  if (
    isDemo &&
    type !== 'demo_submit' &&
    (!STEP_RE.test(step) || stepIndex === undefined || stepIndex < 0 || stepIndex > 50)
  ) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Demo events need a step and its position.');
  }
  if (type === 'demo_answer' && !VALUE_RE.test(value)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'A demo answer needs the chosen option.');
  }

  await siteEventDao.createSiteEvent({
    type,
    visitorId,
    sessionId,
    path,
    referrer: normalizeHost(input.referrer),
    utmSource: asString(input.utmSource, 100).toLowerCase() || undefined,
    utmMedium: asString(input.utmMedium, 100).toLowerCase() || undefined,
    utmCampaign: asString(input.utmCampaign, 150) || undefined,
    device: deviceFromUserAgent(userAgent),
    ...(isDemo && type !== 'demo_submit' ? { step, stepIndex } : {}),
    ...(type === 'demo_answer' ? { value } : {})
  });
  return true;
};

/** The same presets as the Super Admin date picker. `ended` ranges stop at the start of today. */
export const REPORT_RANGES: Record<string, { days: number; ended?: boolean }> = {
  today: { days: 1 },
  yesterday: { days: 1, ended: true },
  last_7_days: { days: 7 },
  last_30_days: { days: 30 },
  last_90_days: { days: 90 }
};

// India has no daylight saving, so IST is always UTC+5:30 and a fixed offset is exact.
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const istDateKey = (instant: number): string => new Date(instant + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Start of the IST day `daysBack` days before `now`'s IST day. */
const istDayStart = (now: Date, daysBack: number): Date => {
  const istMidnight = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(istMidnight - IST_OFFSET_MS - daysBack * DAY_MS);
};

type RawReport = Awaited<ReturnType<typeof siteEventDao.siteReport>>;

const headline = (raw: RawReport, demoRequests: number) => {
  const totals = raw.totals[0] ?? { pageviews: 0, visitors: 0, sessions: 0 };
  const demoStarts = raw.funnel.find((f) => f._id.index === 0)?.sessions ?? 0;
  return {
    pageviews: totals.pageviews,
    visitors: totals.visitors,
    visits: totals.sessions,
    demoStarts,
    demoSubmitted: raw.submits[0]?.sessions ?? 0,
    demoRequests,
    // Share of visitors who asked for a demo. Leads are counted from the leads themselves, so a
    // browser that blocked the analytics call still counts as a request.
    conversionRate: totals.visitors > 0 ? demoRequests / totals.visitors : 0
  };
};

/**
 * The website report for one of the date picker's ranges (IST days), with the same stretch of time
 * just before it for comparison: today so far against yesterday up to the same hour, yesterday
 * against the day before, the last 7 days against the 7 before.
 */
export const getReport = async (preset: string, now: Date = new Date()) => {
  const range = REPORT_RANGES[preset];
  if (!range) {
    throw new ServiceError(400, 'VALIDATION_ERROR', `range must be one of ${Object.keys(REPORT_RANGES).join(', ')}.`);
  }
  const { days } = range;
  const from = istDayStart(now, range.ended ? days : days - 1);
  const to = range.ended ? istDayStart(now, 0) : now;
  const span = days * DAY_MS;
  const prevFrom = new Date(from.getTime() - span);
  const prevTo = new Date(to.getTime() - span);

  const [raw, demoRequests, prevRaw, prevDemoRequests, leadsBySource, leadsByDay] = await Promise.all([
    siteEventDao.siteReport(from, to),
    demoRequestDao.countCreatedBetween(from, to),
    siteEventDao.siteReport(prevFrom, prevTo),
    demoRequestDao.countCreatedBetween(prevFrom, prevTo),
    demoRequestDao.countBySource(from, to),
    demoRequestDao.countByIstDay(from, to)
  ]);

  const byDay = new Map(raw.daily.map((d) => [d._id, d]));
  const leadsOnDay = new Map(leadsByDay.map((d) => [d._id, d.count]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = istDateKey(from.getTime() + i * DAY_MS);
    const hit = byDay.get(date);
    return { date, pageviews: hit?.pageviews ?? 0, visitors: hit?.visitors ?? 0, leads: leadsOnDay.get(date) ?? 0 };
  });

  // Visits and leads side by side per source, so the tab can say which channel actually brings leads.
  const leadsFrom = new Map(leadsBySource.map((l) => [l._id, l.count]));
  const sources = raw.sources.map((s) => ({ source: s._id, visits: s.sessions, leads: leadsFrom.get(s._id) ?? 0 }));
  for (const [source, leads] of leadsFrom) {
    if (!sources.some((s) => s.source === source)) sources.push({ source, visits: 0, leads });
  }
  sources.sort((a, b) => b.leads - a.leads || b.visits - a.visits);

  const funnel = raw.funnel.map((f) => ({ index: f._id.index, step: f._id.step, sessions: f.sessions }));
  const totals = headline(raw, demoRequests);

  return {
    range: { preset, days, from: from.toISOString(), to: to.toISOString() },
    totals,
    previous: headline(prevRaw, prevDemoRequests),
    daily,
    heatmap: raw.heatmap.map((h) => ({ day: h._id.day, hour: h._id.hour, count: h.count })),
    sources,
    devices: raw.devices.map((d) => ({ device: d._id, visits: d.sessions })),
    pages: raw.pages.map((p) => ({ path: p._id, pageviews: p.pageviews, visitors: p.visitors })),
    funnel,
    funnelSubmitted: totals.demoSubmitted,
    answers: raw.answers.map((a) => ({ step: a._id.step, value: a._id.value, visits: a.sessions }))
  };
};
