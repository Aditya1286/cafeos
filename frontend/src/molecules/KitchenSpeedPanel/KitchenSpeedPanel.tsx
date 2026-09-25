import React from 'react';
import { KitchenSpeedStats } from '@/types';
import { NoDataAvailable } from '@/molecules/NoDataAvailable';
import { Timer, ChefHat, Flag } from 'lucide-react';

interface KitchenSpeedPanelProps {
  stats: KitchenSpeedStats;
}

/** Human-readable duration from whole seconds — "45s", "11m", "1h 14m". */
const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/** Real kitchen speed from Order.timeline timestamps — not a marketing number. */
export const KitchenSpeedPanel: React.FC<KitchenSpeedPanelProps> = ({ stats }) => {
  if (stats.sampleSize === 0) {
    return (
      <NoDataAvailable
        icon={Timer}
        title="No timed orders yet"
        message="Once orders are accepted and marked ready, you'll see how fast they get ready here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <Flag className="w-3.5 h-3.5 text-slate-400 mb-1.5" />
          <div className="text-base font-black text-slate-900">{formatDuration(stats.avgAcceptSeconds)}</div>
          <div className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Time to accept</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <ChefHat className="w-3.5 h-3.5 text-slate-400 mb-1.5" />
          <div className="text-base font-black text-slate-900">{formatDuration(stats.avgPrepSeconds)}</div>
          <div className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Kitchen prep time</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <Timer className="w-3.5 h-3.5 text-slate-400 mb-1.5" />
          <div className="text-base font-black text-slate-900">{formatDuration(stats.avgFulfillmentSeconds)}</div>
          <div className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Order to complete</div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-medium">
        Averaged over {stats.sampleSize} order{stats.sampleSize === 1 ? '' : 's'} in the last {stats.windowDays} days.
      </p>
    </div>
  );
};

export default KitchenSpeedPanel;
