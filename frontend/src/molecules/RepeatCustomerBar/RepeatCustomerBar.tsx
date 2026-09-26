import React from 'react';
import { RepeatCustomerStats } from '@/types';
import { formatCurrency } from '@/utils/money';
import { NoDataAvailable } from '@/molecules/NoDataAvailable';
import { Users } from 'lucide-react';

interface RepeatCustomerBarProps {
  stats: RepeatCustomerStats;
}

/** Repeat vs one-time customers, by headcount and by revenue — repeat customers are usually a
 * small share of headcount but a disproportionate share of revenue, which is the point. */
export const RepeatCustomerBar: React.FC<RepeatCustomerBarProps> = ({ stats }) => {
  if (stats.totalCustomers === 0) {
    return (
      <NoDataAvailable
        icon={Users}
        title="No customers yet"
        message="Once paid orders start coming in, you'll see how many customers come back."
      />
    );
  }

  const repeatPct = stats.repeatCustomerPercentage ?? 0;
  const oneTimePct = 100 - repeatPct;
  const repeatRevenuePct = stats.repeatRevenuePercentage ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
          <span>By customers</span>
          <span>{stats.totalCustomers} total</span>
        </div>
        <div className="flex h-8 rounded-xl overflow-hidden border border-slate-200">
          <div
            className="bg-red-500 flex items-center justify-center text-[10px] font-black text-white"
            style={{ width: `${Math.max(repeatPct, repeatPct > 0 ? 6 : 0)}%` }}
          >
            {repeatPct > 12 ? `${repeatPct}%` : ''}
          </div>
          <div
            className="bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500"
            style={{ width: `${oneTimePct}%` }}
          >
            {oneTimePct > 12 ? `${oneTimePct}%` : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
          <div>
            <div className="font-black text-slate-900">
              {repeatPct}% · {stats.repeatCustomers} customers
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Repeat</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
          <div>
            <div className="font-black text-slate-900">
              {oneTimePct}% · {stats.oneTimeCustomers} customers
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">One-time</div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Repeat customers drive</span>
        <span className="font-black text-slate-900">
          {repeatRevenuePct}% of revenue ({formatCurrency(stats.repeatRevenuePaise)})
        </span>
      </div>
    </div>
  );
};

export default RepeatCustomerBar;
