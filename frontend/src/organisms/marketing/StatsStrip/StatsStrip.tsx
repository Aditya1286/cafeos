import React from 'react';
import { HEADLINE_STATS, HeadlineStat } from '@/constants/stats';

/** Four big numbers on a black band: white figures, a red unit, short plain labels. */
export const StatsStrip: React.FC<{ stats?: HeadlineStat[] }> = ({ stats = HEADLINE_STATS }) => (
  <section data-mascot-section="stats" className="bg-slate-950 text-white">
    <dl className="max-w-6xl mx-auto px-4 lg:px-8 py-10 sm:py-16 grid grid-cols-2 md:grid-cols-4 gap-y-8 sm:gap-y-12 md:gap-y-0 md:divide-x md:divide-white/10">
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 md:px-8 text-center md:text-left">
          <dt className="sr-only">{stat.label}</dt>
          <dd className="flex items-baseline justify-center md:justify-start gap-1.5">
            <span className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none">
              {stat.value}
            </span>
            {stat.unit && (
              <span className="text-lg sm:text-xl font-extrabold text-red-500">{stat.unit}</span>
            )}
          </dd>
          <p
            aria-hidden="true"
            className="mt-2 sm:mt-3 text-xs sm:text-base font-semibold text-slate-300 leading-snug"
          >
            {stat.label}
          </p>
        </div>
      ))}
    </dl>
  </section>
);

export default StatsStrip;
