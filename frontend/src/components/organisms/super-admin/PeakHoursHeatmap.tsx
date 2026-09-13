import React from 'react';
import { Flame } from 'lucide-react';
import { computeBusiestHour, HEATMAP_HOURS, formatHeatmapHour } from '../../../utils/adminInsights';

interface PeakHoursHeatmapProps {
  peakHeatmap: { _id: number; orders: number }[];
}

export const PeakHoursHeatmap = ({ peakHeatmap: rawHeatmap }: PeakHoursHeatmapProps) => {
  const byHour = new Map((rawHeatmap || []).map((h) => [h._id, h.orders]));
  // Each bar's height is scaled relative to this platform's own busiest hour so the
  // chart stays legible whether it's 3 orders/day or 300.
  const maxHourlyOrders = Math.max(1, ...HEATMAP_HOURS.map((h) => byHour.get(h) || 0));
  const peakHeatmap = HEATMAP_HOURS.map((h) => ({
    hour: formatHeatmapHour(h),
    orders: byHour.get(h) || 0,
    intensity: Math.round(((byHour.get(h) || 0) / maxHourlyOrders) * 10),
  }));
  const busiestHour = computeBusiestHour(rawHeatmap);

  return (
    <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
      <div>
        <h3 className="text-base font-extrabold text-slate-900">
          Peak Operating Hours Heatmap
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Hourly order density, full day (12 AM – 12 AM next day)
        </p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-2">
        {peakHeatmap.map((item) => (
          <div key={item.hour} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-full h-10 rounded-xl transition-transform hover:scale-105 flex items-center justify-center font-extrabold text-[10px] ${
                item.intensity >= 9
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : item.intensity >= 7
                  ? 'bg-red-400 text-white'
                  : item.intensity >= 5
                  ? 'bg-red-200 text-red-900'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {item.intensity * 10}%
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {item.hour}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
        <Flame className="w-4 h-4 text-red-600 flex-shrink-0" />
        <span>
          {busiestHour
            ? `🔥 Peak hour so far: ${busiestHour.hour} (${busiestHour.orders} paid orders)`
            : 'No paid order activity recorded yet.'}
        </span>
      </div>
    </div>
  );
};

export default PeakHoursHeatmap;
