import React from 'react';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { sourceName } from '@/utils/demoLeads';
import { Card, Empty } from './parts';

/** Which channel brings leads, not just visits: the table to decide where to post. */
export const SourcesCard: React.FC<{ sources: SiteReport['sources'] }> = ({ sources }) => (
  <Card
    title="Where your leads come from"
    sub="Tag links with ?utm_source=instagram to tell your posts apart"
  >
    {sources.length === 0 ? (
      <Empty text="No visits yet." />
    ) : (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-left">
            <th className="pb-2 font-extrabold">Source</th>
            <th className="pb-2 font-extrabold text-right">Visits</th>
            <th className="pb-2 font-extrabold text-right">Leads</th>
            <th className="pb-2 font-extrabold text-right">Turn into leads</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source} className="border-t border-slate-100">
              <td className="py-2.5 font-bold text-slate-800">{sourceName(s.source)}</td>
              <td className="py-2.5 text-right tabular-nums font-semibold text-slate-600">
                {s.visits}
              </td>
              <td className="py-2.5 text-right tabular-nums font-black text-slate-900">
                {s.leads}
              </td>
              <td className="py-2.5 text-right tabular-nums font-bold">
                {s.visits > 0 ? (
                  <span className={s.leads > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                    {Math.round((s.leads / s.visits) * 100)}%
                  </span>
                ) : (
                  <span className="text-slate-300">–</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </Card>
);
