import { describe, it, expect } from 'vitest';
import {
  answerMap,
  painsFor,
  promisesFor,
  sourceName,
  tablesOf,
  talkingPointsFor,
  timeAgo,
  urgencyOf,
  whatsAppLink,
} from '@/utils/demoLeads';
import { DEMO_FUNNEL_ALWAYS, DEMO_FUNNEL_QUESTIONS } from '@/constants/demoFunnel';

const answer = (key: string, value: string) => {
  const q = DEMO_FUNNEL_QUESTIONS.find((x) => x.key === key)!;
  const o = q.options.find((x) => x.value === value)!;
  return { key, question: q.adminTitle, value, answer: o.label };
};

const lead = [
  answer('businessType', 'cafe'),
  answer('tables', '16-30'),
  answer('rushPain', 'orders-mixed'),
  answer('extras', 'rarely'),
  answer('salesKnown', 'after-closing'),
  answer('timeline', 'this-week'),
];

describe('reading a lead', () => {
  it('urgency comes from the timeline answer; leads from before the quiz have none', () => {
    expect(urgencyOf(lead)).toBe('hot');
    expect(urgencyOf([answer('timeline', 'exploring')])).toBe('cold');
    expect(urgencyOf([])).toBeNull();
    expect(urgencyOf(undefined)).toBeNull();
  });

  it('lists only the answers that admit a problem, in their own words', () => {
    expect(painsFor(lead)).toEqual([
      'Orders get missed or mixed up',
      'Today’s sales: Only after I count at closing',
    ]);
    expect(painsFor([answer('extras', 'often')])).toEqual(['Guests skip extras: All the time']);
  });

  it('talking points are the fixes for what they named, without the always-on lines', () => {
    const points = talkingPointsFor(answerMap(lead));
    expect(points).toEqual([
      'Orders going from the table straight to your kitchen',
      'Today’s sales on your phone, live',
    ]);
    expect(promisesFor(answerMap(lead))).toEqual([...points, ...DEMO_FUNNEL_ALWAYS]);
  });

  it('every pain answer has a talking point, so no complaint goes unanswered on the call', () => {
    for (const q of DEMO_FUNNEL_QUESTIONS) {
      for (const o of q.options.filter((x) => x.pain)) {
        expect(talkingPointsFor({ [q.key]: o.value }), `${q.key}=${o.value}`).not.toEqual([]);
      }
    }
  });

  it('tables read naturally', () => {
    expect(tablesOf(lead)).toBe('16 to 30 tables');
    expect(tablesOf([answer('tables', 'takeaway')])).toBe('Mostly takeaway');
    expect(tablesOf([])).toBeNull();
  });
});

describe('formatting', () => {
  it('names sources the way people say them', () => {
    expect(sourceName('instagram')).toBe('Instagram');
    expect(sourceName('l.instagram.com')).toBe('Instagram');
    expect(sourceName('www.google.co.in')).toBe('Google');
    expect(sourceName('Direct')).toBe('Direct / typed the link');
    expect(sourceName('t.co')).toBe('X (Twitter)');
    expect(sourceName('somecafeblog.in')).toBe('somecafeblog.in');
  });

  it('time ago', () => {
    const now = new Date('2026-10-24T12:00:00Z').getTime();
    expect(timeAgo('2026-10-24T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-10-24T11:48:00Z', now)).toBe('12 min');
    expect(timeAgo('2026-10-24T09:00:00Z', now)).toBe('3 h');
    expect(timeAgo('2026-10-23T12:00:00Z', now)).toBe('1 day');
    expect(timeAgo('2026-10-21T12:00:00Z', now)).toBe('3 days');
  });

  it('opens WhatsApp with a first message that names them and their café', () => {
    const url = whatsAppLink('9876543210', 'Asha Rao', 'Brew & Co');
    expect(url.startsWith('https://wa.me/919876543210?text=')).toBe(true);
    const text = decodeURIComponent(url.split('text=')[1]);
    expect(text).toMatch(/^Hi Asha,/);
    expect(text).toContain('Brew & Co');
  });
});
