import {
  DEMO_FUNNEL_ALWAYS,
  DEMO_FUNNEL_PROMISES,
  DEMO_FUNNEL_QUESTIONS,
  DemoLeadUrgency,
} from '@/constants/demoFunnel';
import { APP_NAME } from '@/constants/app';
import type { DemoRequestAnswer } from '@/services/public/demoRequests/types';

// Reading a demo-quiz lead for the person who has to call it: how soon they want it, what hurts,
// what to show them. Everything comes from the quiz's own data (constants/demoFunnel.ts), so
// rewording a question never needs a change here.

const QUESTION_BY_KEY = new Map(DEMO_FUNNEL_QUESTIONS.map((q) => [q.key, q]));

/** `{ questionKey: optionValue }`, from a lead's stored answers. */
export const answerMap = (answers: DemoRequestAnswer[] = []): Record<string, string> =>
  Object.fromEntries(answers.map((a) => [a.key, a.value]));

/** What the call should show them: the fix for each problem they named (then nothing else). */
export const talkingPointsFor = (answers: Record<string, string>): string[] => [
  ...new Set(
    DEMO_FUNNEL_PROMISES.filter((p) => p.values.includes(answers[p.key])).map((p) => p.text),
  ),
];

/** The quiz's last screen: the talking points, then what every trial includes. */
export const promisesFor = (answers: Record<string, string>): string[] => [
  ...talkingPointsFor(answers),
  ...DEMO_FUNNEL_ALWAYS,
];

/** The answers in which the owner admitted a problem, as they read them. */
export const painsFor = (answers: DemoRequestAnswer[] = []): string[] =>
  answers
    .filter((a) => QUESTION_BY_KEY.get(a.key)?.options.find((o) => o.value === a.value)?.pain)
    .map((a) => `${QUESTION_BY_KEY.get(a.key)?.painPrefix ?? ''}${a.answer}`);

export const URGENCY_LABEL: Record<DemoLeadUrgency, string> = {
  hot: 'Wants it this week',
  warm: 'Wants it this month',
  later: 'In a few months',
  cold: 'Just looking',
};

/** How soon they want it running (the timeline answer), or null for a lead from before the quiz. */
export const urgencyOf = (answers: DemoRequestAnswer[] = []): DemoLeadUrgency | null => {
  const timeline = answers.find((a) => a.key === 'timeline');
  if (!timeline) return null;
  return (
    QUESTION_BY_KEY.get('timeline')?.options.find((o) => o.value === timeline.value)?.urgency ??
    null
  );
};

/** The table-count answer, e.g. "16 to 30 tables", or null. */
export const tablesOf = (answers: DemoRequestAnswer[] = []): string | null => {
  const a = answers.find((x) => x.key === 'tables');
  if (!a) return null;
  return a.value === 'takeaway' ? 'Mostly takeaway' : `${a.answer} tables`;
};

/** A friendly name for where a visit or lead came from: `l.instagram.com` and `instagram` both read "Instagram". */
export const sourceName = (raw?: string | null): string => {
  const value = (raw || '').toLowerCase().replace(/^www\./, '');
  if (!value || value === 'direct') return 'Direct / typed the link';
  const known: Array<[RegExp, string]> = [
    [/instagram/, 'Instagram'],
    [/facebook|^fb$|fb\.me/, 'Facebook'],
    [/google/, 'Google'],
    [/youtube|youtu\.be/, 'YouTube'],
    [/whatsapp|wa\.me/, 'WhatsApp'],
    [/linkedin|lnkd\.in/, 'LinkedIn'],
    [/^t\.co$|twitter|^x\.com$|^x$/, 'X (Twitter)'],
    [/bing/, 'Bing'],
  ];
  for (const [pattern, name] of known) if (pattern.test(value)) return name;
  return value;
};

/** "just now", "12 min", "3 h", "2 days": how long ago, short enough for a badge. */
export const timeAgo = (iso: string, now: number = Date.now()): string => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
};

/** Hours since `iso`, for "how long has this lead been waiting". */
export const hoursSince = (iso: string, now: number = Date.now()): number =>
  (now - new Date(iso).getTime()) / 3_600_000;

/** A WhatsApp chat with the lead, the first message already written. */
export const whatsAppLink = (phone: string, name: string, cafe: string): string => {
  const first = name.trim().split(/\s+/)[0] || 'there';
  const text = `Hi ${first}, this is the ${APP_NAME} team. Thanks for asking for a free trial for ${cafe.trim()}! When is a good time for a quick call to set it up?`;
  return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
};
