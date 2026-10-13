import { useCallback, useEffect, useRef, useState } from 'react';
import analyticsService from '@/services/dashboard/analytics';
import type { AnalyticsQueryResponse, MetricOutcome } from '@/services/dashboard/analytics/types';
import {
  buildAnalyticsRequest,
  ViewConfig,
  ViewId,
} from '@/organisms/dashboard/AnalyticsScreen/views';
import { FilterState, rangeIncludesToday } from '@/utils/analyticsFilters';

const FILTER_DEBOUNCE_MS = 250;
const REFRESH_MS = 60_000;

interface LoadedView {
  viewId: ViewId;
  outcomes: Record<string, MetricOutcome>;
  meta: AnalyticsQueryResponse['meta'];
}

/**
 * Loads one analytics view: a single request for every metric it shows. A change of filters reloads
 * after a short pause (and keeps the old numbers, dimmed, meanwhile); switching view starts fresh.
 * While the period includes today, it re-reads every minute whenever the tab is visible.
 */
export function useAnalyticsView(view: ViewConfig, filters: FilterState, enabled = true) {
  const [loaded, setLoaded] = useState<LoadedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the newest request may update the screen (a slow earlier one must not overwrite it).
  const latest = useRef(0);
  const lastViewId = useRef<ViewId | null>(null);

  const load = useCallback(async () => {
    const run = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.query(buildAnalyticsRequest(view, filters));
      if (run !== latest.current) return;
      setLoaded({ viewId: view.id, outcomes: res.results, meta: res.meta });
    } catch (err: any) {
      if (run !== latest.current) return;
      setError(err?.message || 'Could not load analytics. Please try again.');
    } finally {
      if (run === latest.current) setLoading(false);
    }
  }, [view, filters]);

  useEffect(() => {
    if (!enabled) return;
    // A new view loads at once; a changed filter waits a moment in case more changes follow.
    const delay = lastViewId.current === view.id ? FILTER_DEBOUNCE_MS : 0;
    lastViewId.current = view.id;
    const timer = setTimeout(() => void load(), delay);
    return () => clearTimeout(timer);
  }, [load, enabled, view.id]);

  useEffect(() => {
    if (!enabled || !rangeIncludesToday(filters.range)) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, filters.range, load]);

  // Numbers from another view are never shown under this one.
  const current = loaded && loaded.viewId === view.id ? loaded : null;
  return {
    outcomes: current?.outcomes ?? {},
    meta: current?.meta ?? null,
    loading,
    error,
    refresh: load,
  };
}
