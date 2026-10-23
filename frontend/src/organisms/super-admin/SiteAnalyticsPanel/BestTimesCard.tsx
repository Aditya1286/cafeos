import React, { useMemo } from 'react';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { hourName } from '@/utils/siteInsights';
import { Card, Empty } from './parts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Four-hour blocks are enough to plan posts by, and fit a phone screen.
const BLOCKS = [0, 4, 8, 12, 16, 20];

/** When people visit (IST): the three busiest slots in words, then the week as a small grid. */
export const BestTimesCard: React.FC<{ heatmap: SiteReport['heatmap'] }> = ({ heatmap }) => {
  const { grid, max, top } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => new Array<number>(BLOCKS.length).fill(0));
    for (const c of heatmap) g[c.day - 1][Math.floor(c.hour / 4)] += c.count;
    const slots = g
      .flatMap((row, d) => row.map((count, b) => ({ d, b, count })))
      .filter((s) => s.count > 0);
    slots.sort((a, b) => b.count - a.count);
    return { grid: g, max: Math.max(1, ...g.flat()), top: slots.slice(0, 3) };
  }, [heatmap]);

  return (
    <Card
      title="Best times to post"
      sub="When visitors arrive, IST. Post an hour or two before the busiest slots."
    >
      {top.length === 0 ? (
        <Empty text="No visits yet." />
      ) : (
        <>
          <ol className="space-y-1.5 mb-4">
            {top.map((s, i) => (
              <li key={`${s.d}-${s.b}`} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-[10px] font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-bold text-slate-800">
                  {DAY_FULL[s.d]}, {hourName(BLOCKS[s.b])} – {hourName(BLOCKS[s.b] + 4)}
                </span>
                <span className="ml-auto text-slate-400 font-bold tabular-nums">
                  {s.count} views
                </span>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-[34px_repeat(6,minmax(0,1fr))] gap-1">
            <span />
            {BLOCKS.map((h) => (
              <span key={h} className="text-[9px] font-bold text-slate-400 text-center">
                {hourName(h)}
              </span>
            ))}
            {grid.map((row, d) => (
              <React.Fragment key={d}>
                <span className="text-[10px] font-bold text-slate-500 leading-6">{DAYS[d]}</span>
                {row.map((count, b) => (
                  <span
                    key={b}
                    title={`${DAY_FULL[d]} ${hourName(BLOCKS[b])}–${hourName(BLOCKS[b] + 4)}: ${count} views`}
                    className="h-6 rounded-md bg-brand-500"
                    style={{ opacity: count === 0 ? 0.06 : 0.2 + 0.8 * (count / max) }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};
