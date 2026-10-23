import type { DemoFunnelQuestion } from '@/constants/demoFunnel';

// Shapes one quiz question's answers for the Website tab's poll tiles (a 10×10 grid where one
// square is 1% of owners). Colours are the validated `--answer-*` variables (styles/dashboardTheme.css).

export const ANSWER_COLOURS = [
  'var(--answer-1)',
  'var(--answer-2)',
  'var(--answer-3)',
  'var(--answer-4)',
  'var(--answer-5)',
];
export const OTHER_COLOUR = 'var(--answer-other)';
/** More answers than this and the smallest fold into "Other": more colours stop being readable. */
const MAX_SLICES = ANSWER_COLOURS.length;

export interface AnswerSlice {
  key: string;
  label: string;
  count: number;
  /** Whole percent; the slices of one question add up to exactly 100. */
  percent: number;
  colour: string;
}

/**
 * Splits `cells` between counts so they add up exactly (largest remainder), so a 50/50 split is 50
 * squares each and three-way splits never come out at 99 or 101.
 */
export const apportion = (counts: number[], cells = 100): number[] => {
  const total = counts.reduce((n, c) => n + c, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map((c) => (c / total) * cells);
  const out = exact.map(Math.floor);
  let left = cells - out.reduce((n, c) => n + c, 0);
  const order = exact
    .map((x, i) => ({ i, rest: x - Math.floor(x) }))
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (left-- <= 0) break;
    out[i] += 1;
  }
  return out;
};

/**
 * The slices for one question, biggest first. A question with up to five answers gives each answer
 * its own colour by its place in the quiz, so an answer keeps its colour whatever its share. Longer
 * lists (business type, city) keep their four biggest and fold the rest into "Other".
 */
export const answerSlices = (
  question: DemoFunnelQuestion,
  answers: Array<{ value: string; visits: number }>,
): AnswerSlice[] => {
  const label = (value: string) => question.options.find((o) => o.value === value)?.label ?? value;
  const sorted = [...answers].filter((a) => a.visits > 0).sort((a, b) => b.visits - a.visits);

  let rows: Array<{ key: string; label: string; count: number; colour: string }>;
  if (question.options.length <= MAX_SLICES) {
    rows = sorted.map((a) => {
      const index = question.options.findIndex((o) => o.value === a.value);
      return {
        key: a.value,
        label: label(a.value),
        count: a.visits,
        colour: ANSWER_COLOURS[index] ?? OTHER_COLOUR,
      };
    });
  } else {
    const keep = sorted.length <= MAX_SLICES ? sorted : sorted.slice(0, MAX_SLICES - 1);
    rows = keep.map((a, i) => ({
      key: a.value,
      label: label(a.value),
      count: a.visits,
      colour: ANSWER_COLOURS[i],
    }));
    const rest = sorted.slice(keep.length).reduce((n, a) => n + a.visits, 0);
    if (rest > 0) rows.push({ key: 'other', label: 'Other', count: rest, colour: OTHER_COLOUR });
  }

  const percents = apportion(rows.map((r) => r.count));
  return rows.map((r, i) => ({ ...r, percent: percents[i] }));
};
