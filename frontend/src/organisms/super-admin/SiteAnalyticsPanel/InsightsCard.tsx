import React from 'react';
import { Lightbulb, TrendingDown, TrendingUp, Info } from 'lucide-react';
import type { SiteInsight } from '@/utils/siteInsights';

const TONE: Record<SiteInsight['tone'], { icon: typeof Info; className: string }> = {
  good: { icon: TrendingUp, className: 'text-emerald-600 bg-emerald-50' },
  bad: { icon: TrendingDown, className: 'text-rose-600 bg-rose-50' },
  neutral: { icon: Info, className: 'text-slate-500 bg-slate-100' },
  tip: { icon: Lightbulb, className: 'text-amber-600 bg-amber-50' },
};

/** The report in sentences: the first thing to read on the tab. */
export const InsightsCard: React.FC<{ insights: SiteInsight[]; periodLabel: string }> = ({
  insights,
  periodLabel,
}) => (
  <section className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
    <h3 className="text-base font-black text-slate-900">In short, {periodLabel}</h3>
    <ul className="mt-4 space-y-3">
      {insights.map(({ tone, text }) => {
        const { icon: Icon, className } = TONE[tone];
        return (
          <li key={text} className="flex items-start gap-3">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${className}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <p className="text-sm font-semibold text-slate-800 leading-snug pt-1">{text}</p>
          </li>
        );
      })}
    </ul>
  </section>
);
