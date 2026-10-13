import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  DEFAULT_VIEW,
  VIEWS,
  ViewConfig,
  buildAnalyticsRequest,
  getView,
  viewMetricIds,
} from '../src/organisms/dashboard/AnalyticsScreen/views';
import { DEFAULT_FILTERS } from '../src/utils/analyticsFilters';

// Splits a CSS grid track list ("auto minmax(0, 1fr) minmax(0, 1.2fr)") into its tracks.
const tracks = (list: string): number => {
  const repeat = list.match(/^repeat\((\d+),/);
  if (repeat) return Number(repeat[1]);
  let depth = 0;
  let count = 0;
  let inToken = false;
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) inToken = false;
    else if (!inToken) {
      inToken = true;
      count++;
    }
  }
  return count;
};

const areaNames = (view: ViewConfig) => new Set(view.areas.flatMap((row) => row.split(/\s+/)));

describe('analytics views (the screen, as data)', () => {
  it('has the five views in order, each with a unique id', () => {
    expect(VIEWS.map((v) => v.id)).toEqual(['overview', 'menu', 'customers', 'kitchen', 'money']);
    expect(new Set(VIEWS.map((v) => v.id)).size).toBe(VIEWS.length);
    expect(DEFAULT_VIEW).toBe('overview');
    expect(getView('kitchen').id).toBe('kitchen');
    expect(getView('nonsense').id).toBe('overview');
  });

  it.each(VIEWS.map((v) => [v.id, v] as const))(
    '%s: the grid is well formed and every slot has a place in it',
    (_id, view) => {
      const columns = tracks(view.columns);
      for (const row of view.areas)
        expect(row.split(/\s+/).length, `a row of ${view.id} has ${columns} cells`).toBe(columns);
      expect(view.areas.length).toBe(tracks(view.rows));
      const names = areaNames(view);
      for (const slot of view.slots)
        expect(names.has(slot.area), `${slot.id} sits in area ${slot.area}`).toBe(true);
      expect([...names].sort(), 'every named area is used by exactly one slot').toEqual(
        view.slots.map((s) => s.area).sort(),
      );
      expect(new Set(view.slots.map((s) => s.id)).size).toBe(view.slots.length);
    },
  );

  it.each(VIEWS.map((v) => [v.id, v] as const))(
    '%s: fits the one-screen budget (at most 5 KPI cards and 4 chart cards)',
    (_id, view) => {
      const kpis = view.slots.filter((s) => s.component === 'kpi').length;
      expect(kpis).toBeLessThanOrEqual(5);
      expect(view.slots.length - kpis).toBeLessThanOrEqual(4);
    },
  );

  it.each(VIEWS.map((v) => [v.id, v] as const))(
    '%s: a toggle has exactly two named choices, a KPI has one metric',
    (_id, view) => {
      for (const slot of view.slots) {
        expect(slot.metrics.length).toBeGreaterThanOrEqual(1);
        expect(slot.metrics.length).toBeLessThanOrEqual(2);
        if (slot.metrics.length === 2)
          for (const m of slot.metrics) expect(m.label, `${slot.id} toggle choice`).toBeTruthy();
        if (slot.component === 'kpi') expect(slot.metrics.length).toBe(1);
      }
    },
  );

  it('every ranked slot names its bar column, and every column it shows exists in that view', () => {
    for (const view of VIEWS) {
      for (const slot of view.slots.filter((s) => s.component === 'ranked')) {
        for (const m of slot.metrics) {
          const options = { ...slot.options, ...m.options };
          expect(options.primary, `${view.id}/${slot.id}`).toBeTruthy();
          expect(Array.isArray(options.columns ?? [])).toBe(true);
        }
      }
    }
  });

  it('only the Overview and Menu views take category and veg filters; Customers takes no slices at all', () => {
    expect(VIEWS.filter((v) => v.support.itemFilters).map((v) => v.id)).toEqual([
      'overview',
      'menu',
    ]);
    expect(VIEWS.filter((v) => v.support.slices).map((v) => v.id)).toEqual([
      'overview',
      'menu',
      'kitchen',
      'money',
    ]);
    expect(getView('customers').support).toEqual({ slices: false, itemFilters: false });
  });

  it('a view asks for each metric once, in one request, within the server’s cap of 16', () => {
    const overview = getView('overview');
    const ids = viewMetricIds(overview);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'matrix.busy_hours')).toHaveLength(1); // the heatmap toggle shares one metric
    for (const view of VIEWS) expect(viewMetricIds(view).length).toBeLessThanOrEqual(16);
  });

  it('builds the request for a view: its metrics and only the filters it supports', () => {
    const filters = { ...DEFAULT_FILTERS, source: ['QR_TABLE' as const], veg: 'veg' as const };
    const customers = buildAnalyticsRequest(getView('customers'), filters);
    expect(customers.metrics).toEqual(viewMetricIds(getView('customers')));
    expect(customers.filters).toEqual({
      range: { preset: 'last7' },
      compare: 'previous_period',
      granularity: 'auto',
    });
    const menu = buildAnalyticsRequest(getView('menu'), filters);
    expect(menu.filters.source).toEqual(['QR_TABLE']);
    expect(menu.filters.veg).toBe('veg');
  });

  // The frontend and backend agree on metric ids only by convention, so this reads the backend's
  // metric definitions and checks both directions. Skipped when the backend is not alongside.
  const backendMetrics = new URL('../../backend/src/services/analytics/metrics/', import.meta.url);
  (existsSync(backendMetrics) ? it : it.skip)(
    'uses exactly the metric ids the backend registers: none missing, none unused',
    () => {
      const ids = new Set<string>();
      for (const file of readdirSync(backendMetrics).filter(
        (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'shared.ts',
      )) {
        const source = readFileSync(new URL(file, backendMetrics), 'utf8');
        for (const m of source.matchAll(/'((?:kpi|ts|ranked|breakdown|matrix)\.[a-z0-9_]+)'/g))
          ids.add(m[1]);
      }
      const used = new Set(VIEWS.flatMap(viewMetricIds));
      expect(
        [...used].filter((id) => !ids.has(id)),
        'asked for by a view but not registered',
      ).toEqual([]);
      expect(
        [...ids].filter((id) => !used.has(id)),
        'registered but shown nowhere',
      ).toEqual([]);
      expect(ids.size).toBe(32);
    },
  );
});
