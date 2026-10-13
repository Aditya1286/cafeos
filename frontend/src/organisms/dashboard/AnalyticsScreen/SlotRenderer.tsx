import React, { useState } from 'react';
import type {
  MetricOutcome,
  MetricResult,
  RankedResult,
} from '@/services/dashboard/analytics/types';
import {
  ChartCard,
  DonutChart,
  EmptyChart,
  Heatmap,
  KpiCard,
  RankedList,
  TimeSeriesChart,
} from './charts';
import type { SlotConfig, SlotOptions } from './views';

/** What the "View all" dialog needs to show a ranked list in full. */
export interface ViewAllRequest {
  title: string;
  result: RankedResult;
  primary: string;
  columns: string[];
}

interface SlotRendererProps {
  slot: SlotConfig;
  outcomes: Record<string, MetricOutcome>;
  /** The view is loading (a first load shows a skeleton; a reload dims the numbers already there). */
  loading: boolean;
  /** The whole request failed (the network, not one metric). */
  error: string | null;
  onRetry: () => void;
  onViewAll: (request: ViewAllRequest) => void;
}

const body = (
  slot: SlotConfig,
  data: MetricResult,
  options: SlotOptions,
  onViewAll: SlotRendererProps['onViewAll'],
): React.ReactNode => {
  switch (slot.component) {
    case 'kpi':
      if (data.kind === 'kpi')
        return <KpiCard result={data} goodDirection={options.goodDirection} />;
      break;
    case 'timeseries':
      if (data.kind === 'series')
        return (
          <TimeSeriesChart
            result={data}
            variant={options.variant}
            dualAxis={options.dualAxis}
            emptyMessage={options.emptyMessage}
          />
        );
      break;
    case 'donut':
      if (data.kind === 'breakdown')
        return <DonutChart result={data} emptyMessage={options.emptyMessage} />;
      break;
    case 'heatmap':
      if (data.kind === 'matrix')
        return <Heatmap result={data} layer={options.layer} emptyMessage={options.emptyMessage} />;
      break;
    case 'ranked':
      if (data.kind === 'ranked') {
        const primary = options.primary ?? data.columns[0]?.id ?? '';
        const columns = options.columns ?? [];
        return (
          <RankedList
            result={data}
            primary={primary}
            columns={columns}
            emptyMessage={options.emptyMessage}
            onViewAll={() => onViewAll({ title: slot.title, result: data, primary, columns })}
          />
        );
      }
      break;
  }
  return <EmptyChart message="This chart got data it does not know how to show" />;
};

/**
 * Fills one slot of a view: picks the metric (the toggle chooses between two), hands its data to the
 * chart the slot names, and wraps it in a card that handles loading and a failed metric on its own.
 */
export const SlotRenderer: React.FC<SlotRendererProps> = ({
  slot,
  outcomes,
  loading,
  error,
  onRetry,
  onViewAll,
}) => {
  const [active, setActive] = useState(0);
  const choice = slot.metrics[Math.min(active, slot.metrics.length - 1)];
  const options: SlotOptions = { ...slot.options, ...choice.options };
  const outcome = outcomes[choice.metricId];
  const data = outcome && outcome.ok ? outcome.data : null;
  const failure = outcome && !outcome.ok ? outcome.error.message : !outcome && error ? error : null;

  return (
    <ChartCard
      title={slot.title}
      toggle={
        slot.metrics.length > 1
          ? { options: slot.metrics.map((m) => m.label ?? m.metricId), active, onChange: setActive }
          : undefined
      }
      notApplied={data?.notApplied}
      loading={loading && !outcome}
      refreshing={loading && !!outcome}
      error={failure}
      onRetry={onRetry}
    >
      {data && body(slot, data, options, onViewAll)}
    </ChartCard>
  );
};
