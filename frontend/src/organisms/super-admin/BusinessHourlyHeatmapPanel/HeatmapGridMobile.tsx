import React, { useState } from 'react';
import { formatHeatmapHour } from '@/utils/adminInsights';
import { DAY_LABELS, HOURS, intensityClass, HeatmapGridProps, cellFor, formatRupees } from './heatmapShared';

const shortHour = (h: number) => (h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`);

/** Mobile (below `md`): transposed — 7 day columns across, 24 hour rows down — so it fits a phone's
 * width with no sideways scroll. Hover tooltips don't exist on touch, so tapping a cell pins its
 * numbers in the readout above the grid instead. */
export const HeatmapGridMobile = (props: HeatmapGridProps) => {
  const [selected, setSelected] = useState<{ day: number; hour: number } | null>(null);
  const selectedCell = selected ? cellFor(props, selected.day, selected.hour) : null;

  return (
    <div className="space-y-2">
      <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600 min-h-[2.25rem] flex items-center">
        {selected && selectedCell
          ? `${DAY_LABELS[selected.day - 1]} ${formatHeatmapHour(selected.hour)} · ${formatRupees(selectedCell.revenuePaise)} · ${selectedCell.orders} order${selectedCell.orders === 1 ? '' : 's'}`
          : 'Tap a square to see its sales'}
      </div>

      <div className="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-[3px]">
        <div />
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-500">{d.charAt(0)}</div>
        ))}

        {HOURS.map((h) => (
          <React.Fragment key={h}>
            <div className="text-[9px] font-bold text-slate-400 flex items-center">{shortHour(h)}</div>
            {DAY_LABELS.map((_, idx) => {
              const day = idx + 1;
              const { intensity } = cellFor(props, day, h);
              const isSelected = selected?.day === day && selected?.hour === h;
              return (
                <button
                  key={day}
                  onClick={() => setSelected(isSelected ? null : { day, hour: h })}
                  aria-label={`${DAY_LABELS[idx]} ${formatHeatmapHour(h)}`}
                  className={`h-4 rounded-[4px] ${intensityClass(intensity)} ${isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default HeatmapGridMobile;
