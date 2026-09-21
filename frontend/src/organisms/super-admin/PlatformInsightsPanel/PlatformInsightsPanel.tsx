import React from 'react';
import CardSpotlight from '@/atoms/CardSpotlight';
import { SuperAdminMetrics, AdminBusinessSummary } from '@/types';
import { formatCurrency } from '@/utils/money';
import { computeBusiestHour, computeTopBusinessByGMV } from '@/utils/adminInsights';

interface PlatformInsightsPanelProps {
  metrics: SuperAdminMetrics | null;
  businesses: AdminBusinessSummary[];
  peakHeatmap: { _id: number; orders: number }[];
}

interface Insight {
  emoji: string;
  title: string;
  body: string;
}

/**
 * Every card here is computed from real aggregations already loaded on this page — nothing is a
 * canned/fabricated example. A fact that can't yet be computed (not enough data) is simply
 * omitted rather than backfilled with a plausible-looking number.
 */
export const PlatformInsightsPanel = ({ metrics, businesses, peakHeatmap }: PlatformInsightsPanelProps) => {
  const insights: Insight[] = [];

  const busiestHour = computeBusiestHour(peakHeatmap);
  if (busiestHour) {
    insights.push({
      emoji: '🔥',
      title: 'Peak Ordering Hour',
      body: `${busiestHour.hour} is the busiest hour platform-wide, with ${busiestHour.orders} paid orders so far.`,
    });
  }

  const topBusiness = computeTopBusinessByGMV(businesses);
  if (topBusiness && topBusiness.lifetimeGMVPaise > 0) {
    insights.push({
      emoji: '🏆',
      title: 'Top Performing Business',
      body: `${topBusiness.name} leads the platform with ${formatCurrency(topBusiness.lifetimeGMVPaise)} in lifetime GMV.`,
    });
  }

  if (metrics?.repeatCustomerPercentage !== null && metrics?.repeatCustomerPercentage !== undefined) {
    insights.push({
      emoji: '🎯',
      title: 'Repeat Customers',
      body: `${metrics.repeatCustomerPercentage}% of customers (${metrics.repeatCustomers} of ${metrics.totalCustomers}) have ordered more than once.`,
    });
  }

  if (metrics && metrics.lowStockItemsCount > 0) {
    insights.push({
      emoji: '⚠️',
      title: 'Low Stock Alerts',
      body: `${metrics.lowStockItemsCount} ingredient${metrics.lowStockItemsCount === 1 ? '' : 's'} across the platform ${metrics.lowStockItemsCount === 1 ? 'is' : 'are'} at or below its minimum stock level.`,
    });
  }

  if (metrics && metrics.totalGMVPaise > 0) {
    const effectivePct = Math.round((metrics.totalPlatformFeesPaise / metrics.totalGMVPaise) * 1000) / 10;
    insights.push({
      emoji: '📊',
      title: 'Platform Take Rate',
      body: `Platform fees are running at ${effectivePct}% of gross order value across all businesses.`,
    });
  }

  return (
    <CardSpotlight className="my-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/30">
              ✨
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Smart Operational Insights
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Computed live from platform data — updates as orders and businesses do
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200">
            {insights.length} Insight{insights.length === 1 ? '' : 's'} Active
          </span>
        </div>

        {insights.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
            Not enough activity yet to compute insights — check back once orders start coming in.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
            {insights.map((insight) => (
              <div key={insight.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="text-base">{insight.emoji}</span>
                <div>
                  <div className="font-extrabold text-slate-900 mb-0.5">{insight.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{insight.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardSpotlight>
  );
};

export default PlatformInsightsPanel;
