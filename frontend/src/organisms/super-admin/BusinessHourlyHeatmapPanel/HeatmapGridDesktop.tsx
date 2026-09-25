import React from 'react';
import { formatHeatmapHour } from '@/utils/adminInsights';
import { DAY_LABELS, HOURS, intensityClass, HeatmapGridProps, cellFor, formatRupees } from './heatmapShared';

/** Desktop/tablet (`md`+): days down the side, all 24 hours across, hover a cell for its numbers. */
export const HeatmapGridDesktop = (props: HeatmapGridProps) => (
  <div className="overflow-x-auto">
    <div className="min-w-[720px]">
      {/* Hour axis — labelled every 3 hours to stay legible across 24 columns */}
      <div className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-1 mb-1">
        <div />
        {HOURS.map((h) => (
          <div key={h} className="text-center text-[9px] font-bold text-slate-400">
            {h % 3 === 0 ? formatHeatmapHour(h) : ''}
          </div>
        ))}
      </div>

      {DAY_LABELS.map((dayLabel, idx) => {
        const day = idx + 1; // 1 = Sunday
        return (
          <div key={day} className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-1 mb-1">
            <div className="text-[10px] font-bold text-slate-500 flex items-center">{dayLabel}</div>
            {HOURS.map((h) => {
              const { revenuePaise, orders, intensity } = cellFor(props, day, h);
              return (
                <div
                  key={h}
                  title={`${dayLabel} ${formatHeatmapHour(h)}: ${formatRupees(revenuePaise)} (${orders} order${orders === 1 ? '' : 's'})`}
                  className={`aspect-square rounded-md ${intensityClass(intensity)}`}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  </div>
);

export default HeatmapGridDesktop;
