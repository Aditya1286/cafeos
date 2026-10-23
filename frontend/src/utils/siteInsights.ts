import { DEMO_FUNNEL_QUESTIONS } from '@/constants/demoFunnel';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { sourceName } from './demoLeads';

// Turns the Website report's numbers into the few sentences worth reading: is it growing, what
// brings leads, where the quiz loses people, when to post, what owners say. Pure, so it is tested
// without a browser (tests/siteInsights.test.ts).

export interface SiteInsight {
  /** good / bad colour the sentence; tip is an action to take. */
  tone: 'good' | 'bad' | 'neutral' | 'tip';
  text: string;
}

const QUESTION_BY_KEY = new Map(DEMO_FUNNEL_QUESTIONS.map((q) => [q.key, q]));

export const stepTitle = (key: string): string =>
  key === 'contact' ? 'Contact details' : (QUESTION_BY_KEY.get(key)?.adminTitle ?? key);

export const answerLabel = (step: string, value: string): string =>
  QUESTION_BY_KEY.get(step)?.options.find((o) => o.value === value)?.label ?? value;

const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Percent change, or null when there is nothing to compare with. */
export const change = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

/** What the arrows compare with, in words, for the date picker's range. */
export const previousName = (range: Pick<SiteReport['range'], 'preset' | 'days'>): string => {
  if (range.preset === 'today') return 'yesterday by this time';
  if (range.preset === 'yesterday') return 'the day before';
  return `the ${range.days} days before`;
};

/** The range as part of a sentence: "today", "yesterday", "over the last 7 days". */
export const rangePhrase = (range: Pick<SiteReport['range'], 'preset' | 'days'>): string => {
  if (range.preset === 'today') return 'today';
  if (range.preset === 'yesterday') return 'yesterday';
  return `over the last ${range.days} days`;
};

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const hourName = (h: number): string => {
  const hour = ((h % 24) + 24) % 24;
  if (hour === 0) return '12 am';
  if (hour === 12) return '12 pm';
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`;
};

/** The busiest weekday and the busiest two-hour window (IST), or null with too little traffic to say. */
export const busiestTimes = (
  heatmap: SiteReport['heatmap'],
  minimum = 10,
): { day: string; from: number; to: number } | null => {
  const total = heatmap.reduce((n, c) => n + c.count, 0);
  if (total < minimum) return null;
  const byDay = new Array(7).fill(0);
  const byHour = new Array(24).fill(0);
  for (const c of heatmap) {
    byDay[c.day - 1] += c.count;
    byHour[c.hour] += c.count;
  }
  let bestHour = 0;
  for (let h = 0; h < 24; h++) {
    if (byHour[h] + byHour[(h + 1) % 24] > byHour[bestHour] + byHour[(bestHour + 1) % 24])
      bestHour = h;
  }
  return {
    day: DAY_NAMES[byDay.indexOf(Math.max(...byDay))],
    from: bestHour,
    to: (bestHour + 2) % 24,
  };
};

/** Each quiz step with how many reached it and how many left there, ending with "sent it". */
export const funnelSteps = (report: SiteReport) => {
  const steps = [
    ...report.funnel.map((f) => ({
      key: f.step,
      title: `${f.index + 1}. ${stepTitle(f.step)}`,
      reached: f.sessions,
    })),
    { key: 'sent', title: 'Sent the request', reached: report.funnelSubmitted },
  ];
  return steps.map((s, i) => ({
    ...s,
    left: i < steps.length - 1 ? Math.max(0, s.reached - steps[i + 1].reached) : 0,
  }));
};

export const siteInsights = (report: SiteReport): SiteInsight[] => {
  const t = report.totals;
  const prev = report.previous;
  const since = previousName(report.range);
  const out: SiteInsight[] = [];

  if (t.visitors === 0) {
    out.push({
      tone: 'tip',
      text: 'Nobody visited the website in this period. Put the link in your Instagram bio and on every reel.',
    });
    return out;
  }

  const visitorsChange = change(t.visitors, prev.visitors);
  out.push({
    tone: visitorsChange === null ? 'neutral' : visitorsChange >= 0 ? 'good' : 'bad',
    text:
      `${t.visitors} ${t.visitors === 1 ? 'person' : 'people'} visited the website` +
      (visitorsChange === null
        ? '.'
        : visitorsChange === 0
          ? `, the same as ${since}.`
          : `, ${Math.abs(visitorsChange)}% ${visitorsChange > 0 ? 'more' : 'fewer'} than ${since}.`),
  });

  if (t.demoRequests === 0) {
    out.push({ tone: 'bad', text: 'Nobody asked for a demo yet in this period.' });
  } else {
    const oneIn = Math.max(1, Math.round(t.visitors / t.demoRequests));
    out.push({
      tone: 'good',
      text: `${t.demoRequests} asked for a demo: ${pct(t.demoRequests, t.visitors)}% of visitors, about 1 in every ${oneIn}.`,
    });
  }

  const withLeads = report.sources.filter((s) => s.leads > 0);
  if (withLeads.length > 0) {
    const best = withLeads[0];
    out.push({
      tone: 'good',
      text:
        `${sourceName(best.source)} brings the most leads: ${best.leads} of ${t.demoRequests}` +
        (best.visits > 0
          ? ` (${pct(best.leads, best.visits)}% of its visits turn into a lead).`
          : '.'),
    });
  } else if (report.sources.length > 0) {
    const top = [...report.sources].sort((a, b) => b.visits - a.visits)[0];
    out.push({
      tone: 'neutral',
      text: `Most visits come from ${sourceName(top.source)} (${pct(top.visits, t.visits)}%).`,
    });
  }
  const leaky = report.sources.find((s) => s.visits >= 10 && s.leads === 0);
  if (leaky) {
    out.push({
      tone: 'bad',
      text: `${sourceName(leaky.source)} sends ${leaky.visits} visits but no leads yet. Check what those posts promise.`,
    });
  }

  if (t.demoStarts > 0) {
    const finished = pct(report.funnelSubmitted, t.demoStarts);
    const worst = funnelSteps(report).reduce((w, s) => (s.left > w.left ? s : w), {
      key: '',
      title: '',
      reached: 0,
      left: 0,
    });
    out.push({
      tone: finished >= 50 ? 'good' : 'bad',
      text:
        `${finished}% of people who start the quiz send it.` +
        (worst.left > 0
          ? ` The most leave at “${worst.title.replace(/^\d+\. /, '')}” (${worst.left} left there).`
          : ''),
    });
  }

  const busy = busiestTimes(report.heatmap);
  if (busy) {
    out.push({
      tone: 'tip',
      text: `Busiest on ${busy.day}s, between ${hourName(busy.from)} and ${hourName(busy.to)}. Post an hour or two before that.`,
    });
  }

  const pains = report.answers.filter((a) => a.step === 'rushPain');
  const painTotal = pains.reduce((n, a) => n + a.visits, 0);
  if (painTotal >= 3) {
    const top = pains.reduce((m, a) => (a.visits > m.visits ? a : m));
    out.push({
      tone: 'tip',
      text: `Most owners say “${answerLabel('rushPain', top.value)}” (${pct(top.visits, painTotal)}%). Lead your next post with that.`,
    });
  }

  return out;
};
