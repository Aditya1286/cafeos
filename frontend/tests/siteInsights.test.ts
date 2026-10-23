import { describe, it, expect } from 'vitest';
import { busiestTimes, change, funnelSteps, hourName, siteInsights } from '@/utils/siteInsights';
import type { SiteReport, SiteTotals } from '@/services/superAdmin/siteAnalytics/types';

const totals = (over: Partial<SiteTotals> = {}): SiteTotals => ({
  pageviews: 0,
  visitors: 0,
  visits: 0,
  demoStarts: 0,
  demoSubmitted: 0,
  demoRequests: 0,
  conversionRate: 0,
  ...over,
});

const report = (over: Partial<SiteReport> = {}): SiteReport => ({
  range: { preset: 'last_7_days', days: 7, from: '', to: '' },
  totals: totals(),
  previous: totals(),
  daily: [],
  heatmap: [],
  sources: [],
  devices: [],
  pages: [],
  funnel: [],
  funnelSubmitted: 0,
  answers: [],
  ...over,
});

describe('site insights', () => {
  it('no visitors: one sentence, and it says what to do', () => {
    const out = siteInsights(report());
    expect(out).toHaveLength(1);
    expect(out[0].tone).toBe('tip');
  });

  it('says how traffic moved, how many asked, what source works and where the quiz leaks', () => {
    const out = siteInsights(
      report({
        totals: totals({
          visitors: 40,
          visits: 50,
          pageviews: 90,
          demoStarts: 10,
          demoSubmitted: 4,
          demoRequests: 4,
          conversionRate: 0.1,
        }),
        previous: totals({ visitors: 20 }),
        sources: [
          { source: 'instagram', visits: 30, leads: 3 },
          { source: 'google.com', visits: 15, leads: 0 },
          { source: 'Direct', visits: 5, leads: 1 },
        ],
        funnel: [
          { index: 0, step: 'businessType', sessions: 10 },
          { index: 1, step: 'tables', sessions: 9 },
          { index: 2, step: 'rushPain', sessions: 4 },
        ],
        funnelSubmitted: 4,
        answers: [
          { step: 'rushPain', value: 'waiting', visits: 3 },
          { step: 'rushPain', value: 'payments', visits: 1 },
        ],
      }),
    ).map((i) => i.text);

    expect(out[0]).toBe('40 people visited the website, 100% more than the 7 days before.');
    expect(out[1]).toBe('4 asked for a demo: 10% of visitors, about 1 in every 10.');
    expect(out[2]).toBe(
      'Instagram brings the most leads: 3 of 4 (10% of its visits turn into a lead).',
    );
    expect(out[3]).toMatch(/^Google sends 15 visits but no leads yet/);
    expect(out[4]).toBe(
      '40% of people who start the quiz send it. The most leave at “Tables” (5 left there).',
    );
    expect(out[5]).toBe(
      'Most owners say “Guests wait just to order” (75%). Lead your next post with that.',
    );
  });

  it('with nothing before to compare, it does not invent a change', () => {
    const out = siteInsights(report({ totals: totals({ visitors: 3, visits: 3 }) }));
    expect(out[0].text).toBe('3 people visited the website.');
    expect(change(3, 0)).toBeNull();
  });
});

describe('helpers', () => {
  it('funnel steps end with "sent" and count who left at each step', () => {
    const steps = funnelSteps(
      report({
        funnel: [
          { index: 0, step: 'businessType', sessions: 5 },
          { index: 1, step: 'tables', sessions: 3 },
        ],
        funnelSubmitted: 2,
      }),
    );
    expect(steps.map((s) => [s.key, s.reached, s.left])).toEqual([
      ['businessType', 5, 2],
      ['tables', 3, 1],
      ['sent', 2, 0],
    ]);
  });

  it('busiest day and two-hour window, only once there is enough traffic', () => {
    expect(busiestTimes([{ day: 6, hour: 20, count: 3 }])).toBeNull();
    expect(
      busiestTimes([
        { day: 6, hour: 20, count: 6 },
        { day: 6, hour: 21, count: 4 },
        { day: 2, hour: 9, count: 3 },
      ]),
    ).toEqual({ day: 'Saturday', from: 20, to: 22 });
  });

  it('hour names', () => {
    expect([0, 9, 12, 20, 24].map(hourName)).toEqual(['12 am', '9 am', '12 pm', '8 pm', '12 am']);
  });
});
