import type { AnalyticsQueryRequest } from '@/services/dashboard/analytics/types';
import { FilterState, toRequestFilters, ViewSupport } from '@/utils/analyticsFilters';

// The analytics screen, as data. A view is a grid of slots; a slot says which metric (or which two,
// behind a toggle) it shows and with which chart. Adding a chart means registering a metric on the
// backend and adding a slot here: nothing else changes.
//
// Every view fits one screen with no scrolling, so each is held to a budget of at most 5 KPI cards
// plus 4 chart cards (checked in tests/analyticsViews.test.ts).

export type ViewId = 'overview' | 'menu' | 'customers' | 'kitchen' | 'money';
export type SlotComponent = 'kpi' | 'timeseries' | 'donut' | 'ranked' | 'heatmap';

export interface SlotOptions {
  /** kpi: which direction of change is good news (colours the change). Omit for neutral. */
  goodDirection?: 'up' | 'down';
  /** timeseries: how the lines are drawn. */
  variant?: 'line' | 'bar' | 'stackedBar' | 'barLine';
  /** timeseries: put the second series on its own right-hand axis ('barLine' always does). */
  dualAxis?: boolean;
  /** ranked: the column drawn as a bar; the others are shown as plain figures beside it. */
  primary?: string;
  columns?: string[];
  /** heatmap: which of the metric's layers to colour by. */
  layer?: string;
  /** What a card says when its metric has nothing to show (the default is generic). */
  emptyMessage?: string;
}

export interface SlotMetric {
  metricId: string;
  /** Names this choice in the slot's toggle (only needed when a slot has two). */
  label?: string;
  options?: SlotOptions;
}

export interface SlotConfig {
  id: string;
  /** The grid area (named in the view's `areas`). */
  area: string;
  title: string;
  component: SlotComponent;
  /** One metric, or two the owner can switch between. */
  metrics: SlotMetric[];
  options?: SlotOptions;
}

export interface ViewConfig {
  id: ViewId;
  label: string;
  /** Which filters this view can honour; the filter bar disables the rest. */
  support: ViewSupport;
  /** CSS grid, desktop. `areas` is one string per row, area names separated by spaces. */
  columns: string;
  rows: string;
  areas: string[];
  slots: SlotConfig[];
}

const kpi = (
  id: string,
  area: string,
  title: string,
  metricId: string,
  goodDirection?: 'up' | 'down',
): SlotConfig => ({
  id,
  area,
  title,
  component: 'kpi',
  metrics: [{ metricId }],
  options: goodDirection ? { goodDirection } : undefined,
});

const FILL = 'minmax(0, 1fr)';

export const VIEWS: ViewConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    support: { slices: true, itemFilters: true },
    columns: `repeat(4, ${FILL})`,
    rows: `auto ${FILL} ${FILL}`,
    areas: ['k1 k2 k3 k4', 'trend trend trend mix', 'daypart heat heat heat'],
    slots: [
      kpi('net-sales', 'k1', 'Net sales', 'kpi.net_sales', 'up'),
      kpi('orders', 'k2', 'Orders', 'kpi.orders', 'up'),
      kpi('avg-ticket', 'k3', 'Average ticket', 'kpi.avg_ticket', 'up'),
      kpi('items-per-order', 'k4', 'Items per order', 'kpi.items_per_order', 'up'),
      {
        id: 'trend',
        area: 'trend',
        title: 'Sales and orders',
        component: 'timeseries',
        metrics: [{ metricId: 'ts.sales_orders' }],
        options: { variant: 'line' },
      },
      {
        id: 'mix',
        area: 'mix',
        title: 'Sales mix',
        component: 'donut',
        metrics: [
          { metricId: 'breakdown.source', label: 'Source' },
          { metricId: 'breakdown.payment', label: 'Payment' },
        ],
      },
      {
        id: 'daypart',
        area: 'daypart',
        title: 'Average ticket by time of day',
        component: 'ranked',
        metrics: [{ metricId: 'ranked.avg_ticket_by_daypart' }],
        options: { primary: 'avg_ticket', columns: ['orders'] },
      },
      {
        id: 'busy',
        area: 'heat',
        title: 'Busy hours',
        component: 'heatmap',
        metrics: [
          { metricId: 'matrix.busy_hours', label: 'Orders', options: { layer: 'orders' } },
          { metricId: 'matrix.busy_hours', label: 'Sales', options: { layer: 'sales' } },
        ],
      },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    support: { slices: true, itemFilters: true },
    columns: `repeat(4, ${FILL})`,
    rows: `${FILL} ${FILL}`,
    areas: ['items items mix attach', 'items items slow slow'],
    slots: [
      {
        id: 'items',
        area: 'items',
        title: 'Items and what they earn',
        component: 'ranked',
        metrics: [{ metricId: 'ranked.items' }],
        options: { primary: 'revenue', columns: ['units', 'share', 'margin', 'trend'] },
      },
      {
        id: 'mix',
        area: 'mix',
        title: 'Sales mix',
        component: 'donut',
        metrics: [
          { metricId: 'breakdown.category', label: 'Category' },
          { metricId: 'breakdown.veg', label: 'Veg / non-veg' },
        ],
      },
      kpi('attach', 'attach', 'Add-on attach rate', 'kpi.addon_attach_rate', 'up'),
      {
        id: 'slow',
        area: 'slow',
        title: 'Slow movers',
        component: 'ranked',
        metrics: [{ metricId: 'ranked.slow_movers' }],
        options: {
          primary: 'days',
          columns: [],
          emptyMessage: 'Everything on the menu sold in this period.',
        },
      },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    support: { slices: false, itemFilters: false },
    columns: `repeat(4, ${FILL})`,
    rows: `${FILL} minmax(0, 1.2fr)`,
    areas: ['active ts ts ts', 'freq people people people'],
    slots: [
      kpi('active', 'active', 'Active customers', 'kpi.active_customers', 'up'),
      {
        id: 'new-returning',
        area: 'ts',
        title: 'New and returning',
        component: 'timeseries',
        metrics: [{ metricId: 'ts.new_vs_returning' }],
        options: { variant: 'stackedBar' },
      },
      {
        id: 'frequency',
        area: 'freq',
        title: 'How often they come',
        component: 'donut',
        metrics: [{ metricId: 'breakdown.visit_frequency' }],
      },
      {
        id: 'people',
        area: 'people',
        title: 'Customers',
        component: 'ranked',
        metrics: [
          {
            metricId: 'ranked.top_customers',
            label: 'Top',
            options: {
              primary: 'spent',
              columns: ['visits'],
              emptyMessage: 'No customers in this period.',
            },
          },
          {
            metricId: 'ranked.lapsed_customers',
            label: 'Lapsed',
            options: {
              primary: 'spent',
              columns: ['visits', 'days'],
              emptyMessage: 'No regulars have drifted away.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    support: { slices: true, itemFilters: false },
    columns: `repeat(4, ${FILL})`,
    rows: `auto ${FILL}`,
    areas: ['k1 k2 k3 k4', 'times times hours hours'],
    slots: [
      kpi('prep-median', 'k1', 'Typical prep time', 'kpi.prep_median', 'down'),
      kpi('prep-p90', 'k2', 'Slowest 1 in 10', 'kpi.prep_p90', 'down'),
      kpi('fulfil', 'k3', 'Typical total time', 'kpi.fulfil_median', 'down'),
      kpi('late', 'k4', 'Late orders', 'kpi.late_rate', 'down'),
      {
        id: 'times',
        area: 'times',
        title: 'Kitchen times',
        component: 'timeseries',
        metrics: [{ metricId: 'ts.kitchen_times' }],
        options: { variant: 'line' },
      },
      {
        id: 'hours',
        area: 'hours',
        title: 'Orders per hour of the day',
        component: 'timeseries',
        metrics: [{ metricId: 'ts.throughput_by_hour' }],
        options: { variant: 'bar' },
      },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    support: { slices: true, itemFilters: false },
    columns: `repeat(5, ${FILL})`,
    rows: `auto ${FILL}`,
    areas: ['k1 k2 k3 k4 k5', 'over over over why why'],
    slots: [
      kpi('cancel-rate', 'k1', 'Cancelled orders', 'kpi.cancel_rate', 'down'),
      kpi('refunds', 'k2', 'Refunded', 'kpi.refunds', 'down'),
      kpi('refund-pending', 'k3', 'Refunds waiting', 'kpi.refund_pending', 'down'),
      kpi('unpaid', 'k4', 'Served, not paid', 'kpi.unpaid_served', 'down'),
      kpi('gst', 'k5', 'GST collected', 'kpi.gst_collected'),
      {
        id: 'cancellations',
        area: 'over',
        title: 'Orders and cancellations',
        component: 'timeseries',
        metrics: [{ metricId: 'ts.cancellations' }],
        options: { variant: 'barLine', dualAxis: true },
      },
      {
        id: 'reasons',
        area: 'why',
        title: 'Why orders were cancelled',
        component: 'ranked',
        metrics: [{ metricId: 'ranked.cancel_reasons' }],
        options: {
          primary: 'orders',
          columns: ['lost'],
          emptyMessage: 'No cancellations in this period.',
        },
      },
    ],
  },
];

export const DEFAULT_VIEW: ViewId = 'overview';

export const getView = (id: string): ViewConfig => VIEWS.find((v) => v.id === id) ?? VIEWS[0];

/** Every metric id a view needs, once each (a toggle's two choices may share a metric). */
export const viewMetricIds = (view: ViewConfig): string[] => [
  ...new Set(view.slots.flatMap((s) => s.metrics.map((m) => m.metricId))),
];

/** The one request that loads a whole view. */
export const buildAnalyticsRequest = (
  view: ViewConfig,
  filters: FilterState,
): AnalyticsQueryRequest => ({
  metrics: viewMetricIds(view),
  filters: toRequestFilters(filters, view.support),
});
