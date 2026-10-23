import React from 'react';
import { BarChart3, Globe, RefreshCw, Store } from 'lucide-react';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { previousName } from '@/utils/siteInsights';
import { SiteAnalyticsPanel } from '@/organisms/super-admin/SiteAnalyticsPanel';
import { PlatformAnalyticsPanel } from '@/organisms/super-admin/PlatformAnalyticsPanel';

type PlatformProps = React.ComponentProps<typeof PlatformAnalyticsPanel>;

interface ReportsPanelProps {
  /** The date picker's label, e.g. "Last 7 Days". Both halves use that range. */
  rangeLabel: string;
  siteReport: SiteReport | null;
  loading: boolean;
  onRefresh: () => void;
  platform: PlatformProps;
}

const SECTIONS = [
  { id: 'report-website', label: 'Website & leads', icon: Globe },
  { id: 'report-cafes', label: 'Cafés & payments', icon: Store },
];

const SectionHeading: React.FC<{ id: string; icon: typeof Globe; title: string; sub: string }> = ({
  id,
  icon: Icon,
  title,
  sub,
}) => (
  <div id={id} className="scroll-mt-28 flex items-start gap-3 pt-2">
    <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </span>
    <div>
      <h3 className="text-base sm:text-lg font-black text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 font-medium">{sub}</p>
    </div>
  </div>
);

/**
 * Every number in one tab, for the range in the top bar's date picker: first the website (visitors,
 * leads, the demo quiz), then the cafés already on CAOS (sales, fees, how customers paid).
 */
export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  rangeLabel,
  siteReport,
  loading,
  onRefresh,
  platform,
}) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-500" /> Reports
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
              {rangeLabel}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Website and cafés together. Change the period with the date picker at the top; arrows
            compare with {siteReport ? previousName(siteReport.range) : 'the period before'}.
          </p>
        </div>
        <button
          onClick={onRefresh}
          aria-label="Refresh"
          className="shrink-0 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>
      <nav className="flex gap-2 overflow-x-auto" aria-label="Jump to">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </a>
        ))}
      </nav>
    </div>

    <SectionHeading
      id="report-website"
      icon={Globe}
      title="Website & leads"
      sub="Visitors to the marketing site and how many ask for a demo. Bots and signed-in users don't count."
    />
    <SiteAnalyticsPanel report={siteReport} />

    <SectionHeading
      id="report-cafes"
      icon={Store}
      title="Cafés & payments"
      sub="What cafés on CAOS sold, what the platform earned, and how their customers paid."
    />
    <PlatformAnalyticsPanel {...platform} />
  </div>
);

export default ReportsPanel;
