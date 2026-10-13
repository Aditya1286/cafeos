import React, { useEffect, useState } from 'react';
import { useAnalyticsView } from '@/hooks/useAnalyticsView';
import {
  FilterState,
  loadFilters,
  loadViewId,
  saveFilters,
  saveViewId,
} from '@/utils/analyticsFilters';
import { FilterBar } from './FilterBar';
import { ScreenGrid } from './ScreenGrid';
import { SlotRenderer, ViewAllRequest } from './SlotRenderer';
import { ViewAllModal } from './ViewAllModal';
import { ViewTabs } from './ViewTabs';
import { DEFAULT_VIEW, VIEWS, ViewId, getView } from './views';

interface AnalyticsScreenProps {
  businessId: string;
  /** The café's menu categories, for the category filter. */
  categories: { _id: string; name: string }[];
}

/**
 * The owner's analytics: view tabs and filters on one line, and under them the open view, laid out
 * to fill the rest of the screen exactly. It must be given a bounded height (the dashboard switches
 * to a fixed-viewport layout for this tab): nothing in here ever makes the page scroll.
 */
export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ businessId, categories }) => {
  const [filters, setFilters] = useState<FilterState>(() => loadFilters(businessId));
  const [viewId, setViewId] = useState<ViewId>(
    () =>
      (loadViewId(
        businessId,
        VIEWS.map((v) => v.id),
      ) as ViewId | null) ?? DEFAULT_VIEW,
  );
  const [viewAll, setViewAll] = useState<ViewAllRequest | null>(null);
  const view = getView(viewId);
  const { outcomes, loading, error, refresh } = useAnalyticsView(view, filters);

  useEffect(() => saveFilters(businessId, filters), [businessId, filters]);
  useEffect(() => saveViewId(businessId, viewId), [businessId, viewId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <ViewTabs views={VIEWS} active={view.id} onChange={setViewId} />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          support={view.support}
          categories={categories}
          onRefresh={() => void refresh()}
          refreshing={loading}
        />
      </div>
      <div className="min-h-0 flex-1">
        <ScreenGrid
          view={view}
          renderSlot={(slot) => (
            <SlotRenderer
              slot={slot}
              outcomes={outcomes}
              loading={loading}
              error={error}
              onRetry={() => void refresh()}
              onViewAll={setViewAll}
            />
          )}
        />
      </div>
      {viewAll && <ViewAllModal request={viewAll} onClose={() => setViewAll(null)} />}
    </div>
  );
};

export default AnalyticsScreen;
