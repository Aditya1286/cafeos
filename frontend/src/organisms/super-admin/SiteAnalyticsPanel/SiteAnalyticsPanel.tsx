import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { rangePhrase, siteInsights } from '@/utils/siteInsights';
import { Card, Delta, Empty } from './parts';
import { HBarChart } from './HBarChart';
import { InsightsCard } from './InsightsCard';
import { TrafficChart } from './TrafficChart';
import { SourcesCard } from './SourcesCard';
import { QuizFunnelCard } from './QuizFunnelCard';
import { AnswersCard } from './AnswersCard';
import { BestTimesCard } from './BestTimesCard';

interface SiteAnalyticsPanelProps {
  report: SiteReport | null;
}

const rate = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/**
 * The website half of the Reports tab, read top-down: a few sentences that say what matters, the
 * four numbers that move, then the detail behind them (traffic, sources, the quiz, answers, timing).
 * Its range is the date picker's, chosen in the top bar (see ReportsPanel).
 */
export const SiteAnalyticsPanel: React.FC<SiteAnalyticsPanelProps> = ({ report }) => {
  const insights = useMemo(() => (report ? siteInsights(report) : []), [report]);
  const phrase = report ? rangePhrase(report.range) : '';

  const kpis = report
    ? [
        {
          label: 'Visitors',
          value: String(report.totals.visitors),
          hint: `${report.totals.pageviews} pages opened`,
          delta: <Delta current={report.totals.visitors} previous={report.previous.visitors} />,
        },
        {
          label: 'Demo requests',
          value: String(report.totals.demoRequests),
          hint: 'leads from the quiz',
          delta: (
            <Delta current={report.totals.demoRequests} previous={report.previous.demoRequests} />
          ),
        },
        {
          label: 'Visitors → leads',
          value: `${(report.totals.conversionRate * 100).toFixed(1)}%`,
          hint: 'of visitors asked for a demo',
          delta: (
            <Delta
              points
              comparable={report.previous.visitors > 0}
              current={report.totals.conversionRate}
              previous={report.previous.conversionRate}
            />
          ),
        },
        {
          label: 'Quiz finished',
          value: `${Math.round(rate(report.totals.demoSubmitted, report.totals.demoStarts) * 100)}%`,
          hint: `${report.totals.demoSubmitted} of ${report.totals.demoStarts} who started`,
          delta: (
            <Delta
              points
              comparable={report.previous.demoStarts > 0}
              current={rate(report.totals.demoSubmitted, report.totals.demoStarts)}
              previous={rate(report.previous.demoSubmitted, report.previous.demoStarts)}
            />
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {!report ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="lg:col-span-3">
              <InsightsCard insights={insights} periodLabel={phrase} />
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 content-start">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {k.label}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {k.value}
                    </span>
                    {k.delta}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{k.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <TrafficChart daily={report.daily} />
            <SourcesCard sources={report.sources} />
            <QuizFunnelCard report={report} />
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <BestTimesCard heatmap={report.heatmap} />
              <Card title="Pages and devices">
                {report.pages.length === 0 ? (
                  <Empty text="No page views yet." />
                ) : (
                  <div className="space-y-5">
                    <HBarChart
                      ariaLabel="Page views per page"
                      rows={report.pages.slice(0, 6).map((p) => ({
                        key: p.path,
                        label: p.path === '/' ? 'Home page' : p.path,
                        value: p.pageviews,
                        display: String(p.pageviews),
                        detail: `${p.pageviews} views by ${p.visitors} ${p.visitors === 1 ? 'person' : 'people'}`,
                      }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {report.devices.map((d) => (
                        <span
                          key={d.device}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                        >
                          {d.device[0].toUpperCase() + d.device.slice(1)}{' '}
                          <span className="text-slate-900 font-black">
                            {Math.round(rate(d.visits, report.totals.visits) * 100)}%
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <AnswersCard answers={report.answers} />
        </>
      )}
    </div>
  );
};

export default SiteAnalyticsPanel;
