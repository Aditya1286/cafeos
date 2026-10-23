import { describe, it, expect } from 'vitest';
import { apportion, answerSlices, ANSWER_COLOURS, OTHER_COLOUR } from '@/utils/answerChart';
import { DEMO_FUNNEL_QUESTIONS } from '@/constants/demoFunnel';

const q = (key: string) => DEMO_FUNNEL_QUESTIONS.find((x) => x.key === key)!;

describe('apportion: squares always add up to exactly 100', () => {
  it('splits evenly and by largest remainder', () => {
    expect(apportion([1, 1])).toEqual([50, 50]);
    expect(apportion([1, 1, 1])).toEqual([34, 33, 33]);
    expect(apportion([2, 1])).toEqual([67, 33]);
    expect(apportion([0, 0])).toEqual([0, 0]);
    for (const counts of [
      [3, 7, 11],
      [1, 2, 3, 4, 5],
      [999, 1],
    ]) {
      expect(apportion(counts).reduce((n, c) => n + c, 0)).toBe(100);
    }
  });
});

describe('answerSlices', () => {
  it('biggest first, and an answer keeps its colour whatever its share', () => {
    const a = answerSlices(q('rushPain'), [
      { value: 'waiting', visits: 1 },
      { value: 'orders-mixed', visits: 3 },
    ]);
    expect(a.map((s) => [s.label, s.percent])).toEqual([
      ['Orders get missed or mixed up', 75],
      ['Guests wait just to order', 25],
    ]);
    // Colour comes from the answer's place in the quiz, not its rank.
    expect(a[0].colour).toBe(ANSWER_COLOURS[0]);
    expect(a[1].colour).toBe(ANSWER_COLOURS[1]);
    const b = answerSlices(q('rushPain'), [
      { value: 'waiting', visits: 5 },
      { value: 'orders-mixed', visits: 1 },
    ]);
    expect(b.find((s) => s.key === 'waiting')!.colour).toBe(ANSWER_COLOURS[1]);
  });

  it('long lists keep the four biggest and fold the rest into Other', () => {
    const cities = ['mumbai', 'pune', 'delhi-ncr', 'jaipur', 'chennai', 'kolkata'].map(
      (value, i) => ({ value, visits: 10 - i }),
    );
    const s = answerSlices(q('city'), cities);
    expect(s.map((x) => x.label)).toEqual(['Mumbai', 'Pune', 'Delhi NCR', 'Jaipur', 'Other']);
    expect(s[4].count).toBe(6 + 5);
    expect(s[4].colour).toBe(OTHER_COLOUR);
    expect(s.reduce((n, x) => n + x.percent, 0)).toBe(100);
  });

  it('ignores answers nobody picked', () => {
    expect(answerSlices(q('timeline'), [{ value: 'this-week', visits: 0 }])).toEqual([]);
  });
});
