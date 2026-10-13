import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS,
  FilterState,
  activeFilterCount,
  describeRange,
  loadFilters,
  loadViewId,
  parseStoredFilters,
  rangeIncludesToday,
  saveFilters,
  saveViewId,
  todayKey,
  toRequestFilters,
  validateCustomRange,
} from '../src/utils/analyticsFilters';

const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};
const CAT = 'a'.repeat(24);
const busy: FilterState = {
  ...DEFAULT_FILTERS,
  source: ['QR_TABLE'],
  paymentMethod: ['CASH', 'CARD'],
  daypart: ['morning'],
  categoryIds: [CAT],
  veg: 'veg',
};

describe('analytics filters: what a view sends', () => {
  it('starts on the last 7 days against the previous period with nothing sliced', () => {
    expect(DEFAULT_FILTERS).toEqual({
      range: { preset: 'last7' },
      compare: 'previous_period',
      granularity: 'auto',
      source: [],
      paymentMethod: [],
      daypart: [],
      categoryIds: [],
      veg: null,
    });
  });

  it('sends slices and item filters only to views that support them', () => {
    expect(toRequestFilters(busy, { slices: true, itemFilters: true })).toEqual({
      range: { preset: 'last7' },
      compare: 'previous_period',
      granularity: 'auto',
      source: ['QR_TABLE'],
      paymentMethod: ['CASH', 'CARD'],
      daypart: ['morning'],
      categoryIds: [CAT],
      veg: 'veg',
    });
    const kitchen = toRequestFilters(busy, { slices: true, itemFilters: false });
    expect(kitchen.source).toEqual(['QR_TABLE']);
    expect('categoryIds' in kitchen || 'veg' in kitchen).toBe(false);
    const customers = toRequestFilters(busy, { slices: false, itemFilters: false });
    expect(Object.keys(customers).sort()).toEqual(['compare', 'granularity', 'range']);
  });

  it('counts the filters in force for the badge', () => {
    expect(activeFilterCount(DEFAULT_FILTERS, { slices: true, itemFilters: true })).toBe(0);
    expect(activeFilterCount(busy, { slices: true, itemFilters: true })).toBe(5);
    expect(activeFilterCount(busy, { slices: true, itemFilters: false })).toBe(3);
    expect(activeFilterCount(busy, { slices: false, itemFilters: false })).toBe(0);
  });
});

describe('analytics filters: dates', () => {
  it('validates a custom range: real dates, in order, at most 366 days', () => {
    expect(validateCustomRange('2026-10-01', '2026-10-13')).toBeNull();
    expect(validateCustomRange('2026-10-13', '2026-10-13')).toBeNull();
    expect(validateCustomRange('2024-01-01', '2024-12-31')).toBeNull(); // 366 days, leap year
    expect(validateCustomRange('2025-01-01', '2026-01-02')).toMatch(/at most 366/);
    expect(validateCustomRange('2026-10-13', '2026-10-01')).toMatch(/after/);
    expect(validateCustomRange('2026-02-30', '2026-03-02')).toMatch(/both dates/);
    expect(validateCustomRange('', '2026-03-02')).toMatch(/both dates/);
  });

  it('knows whether a range still includes today (so it should keep refreshing)', () => {
    expect(rangeIncludesToday({ preset: 'today' }, '2026-10-13')).toBe(true);
    expect(rangeIncludesToday({ preset: 'last7' }, '2026-10-13')).toBe(true);
    expect(rangeIncludesToday({ preset: 'last30' }, '2026-10-13')).toBe(true);
    expect(rangeIncludesToday({ preset: 'thisMonth' }, '2026-10-13')).toBe(true);
    expect(rangeIncludesToday({ preset: 'yesterday' }, '2026-10-13')).toBe(false);
    expect(rangeIncludesToday({ preset: 'lastMonth' }, '2026-10-13')).toBe(false);
    expect(rangeIncludesToday({ from: '2026-10-01', to: '2026-10-13' }, '2026-10-13')).toBe(true);
    expect(rangeIncludesToday({ from: '2026-10-01', to: '2026-10-12' }, '2026-10-13')).toBe(false);
  });

  it('formats today as a plain local date and names a range for humans', () => {
    expect(todayKey(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(describeRange({ preset: 'last30' })).toBe('Last 30 days');
    expect(describeRange({ from: '2026-10-01', to: '2026-10-13' })).toBe(
      '2026-10-01 to 2026-10-13',
    );
    expect(describeRange({ from: '2026-10-01', to: '2026-10-01' })).toBe('2026-10-01');
  });
});

describe('analytics filters: remembered per café', () => {
  it('saves and loads, separately for each café', () => {
    const s = store();
    saveFilters('biz-a', busy, s);
    saveFilters('biz-b', { ...DEFAULT_FILTERS, compare: 'none' }, s);
    expect(loadFilters('biz-a', s)).toEqual(busy);
    expect(loadFilters('biz-b', s).compare).toBe('none');
    expect(loadFilters('biz-c', s)).toEqual(DEFAULT_FILTERS);
  });

  it('keeps a custom range and a granularity choice', () => {
    const s = store();
    const custom: FilterState = {
      ...DEFAULT_FILTERS,
      range: { from: '2026-09-01', to: '2026-09-30' },
      granularity: 'week',
    };
    saveFilters('biz', custom, s);
    expect(loadFilters('biz', s)).toEqual(custom);
  });

  it('keeps what is still valid and defaults the rest when the saved value is damaged or from an old version', () => {
    expect(parseStoredFilters(null)).toEqual(DEFAULT_FILTERS);
    expect(parseStoredFilters('{not json')).toEqual(DEFAULT_FILTERS);
    expect(parseStoredFilters('[]')).toEqual(DEFAULT_FILTERS);
    expect(parseStoredFilters('"x"')).toEqual(DEFAULT_FILTERS);
    const messy = parseStoredFilters(
      JSON.stringify({
        range: { preset: 'forever' },
        compare: 'none',
        granularity: 'fortnight',
        source: ['QR_TABLE', 'WAITER', 7],
        paymentMethod: 'CASH',
        daypart: ['night', 'night'],
        categoryIds: [CAT, 'nope', 5],
        veg: 'vegan',
      }),
    );
    expect(messy).toEqual({
      ...DEFAULT_FILTERS,
      compare: 'none',
      source: ['QR_TABLE'],
      daypart: ['night'],
      categoryIds: [CAT],
    });
    // an impossible custom range is dropped rather than sent to the server
    expect(
      parseStoredFilters(JSON.stringify({ range: { from: '2026-10-13', to: '2026-10-01' } })).range,
    ).toEqual({ preset: 'last7' });
    expect(
      parseStoredFilters(JSON.stringify({ range: { from: '2026-02-30', to: '2026-03-01' } })).range,
    ).toEqual({ preset: 'last7' });
  });

  it('never throws, even without storage or when storage refuses', () => {
    expect(loadFilters('biz', null)).toEqual(DEFAULT_FILTERS);
    expect(() => saveFilters('biz', busy, null)).not.toThrow();
    const hostile = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadFilters('biz', hostile)).toEqual(DEFAULT_FILTERS);
    expect(() => saveFilters('biz', busy, hostile)).not.toThrow();
  });
});

describe('analytics filters: the last view opened', () => {
  const VIEWS = ['overview', 'menu', 'customers', 'kitchen', 'money'];

  it('remembers the view per café', () => {
    const s = store();
    saveViewId('biz-a', 'kitchen', s);
    saveViewId('biz-b', 'money', s);
    expect(loadViewId('biz-a', VIEWS, s)).toBe('kitchen');
    expect(loadViewId('biz-b', VIEWS, s)).toBe('money');
    expect(loadViewId('biz-c', VIEWS, s)).toBeNull();
  });

  it('ignores a saved view that no longer exists, and never throws', () => {
    const s = store();
    saveViewId('biz', 'retired-view', s);
    expect(loadViewId('biz', VIEWS, s)).toBeNull();
    expect(loadViewId('biz', VIEWS, null)).toBeNull();
    const hostile = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadViewId('biz', VIEWS, hostile)).toBeNull();
    expect(() => saveViewId('biz', 'menu', hostile)).not.toThrow();
    expect(() => saveViewId('biz', 'menu', null)).not.toThrow();
  });
});
