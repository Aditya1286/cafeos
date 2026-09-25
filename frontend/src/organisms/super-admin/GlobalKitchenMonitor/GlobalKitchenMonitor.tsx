import React from 'react';
import EmptyState from '@/atoms/EmptyState';
import { toast } from '@/utils/toast';
import { formatCurrency } from '@/utils/money';

interface GlobalKitchenMonitorProps {
  liveOrders: any[];
}

export const GlobalKitchenMonitor = ({ liveOrders }: GlobalKitchenMonitorProps) => (
  <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
      <div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
          Live Kitchens
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Orders being prepared right now at every business
        </p>
      </div>
      <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200 whitespace-nowrap">
        {liveOrders.length} Orders in Progress
      </span>
    </div>

    {liveOrders.length === 0 ? (
      <EmptyState
        title="No orders in progress"
        description="Orders show up here the moment they're placed."
      />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {liveOrders.map((ord) => (
          <div
            key={ord.id || ord._id}
            className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-base">
                Order #{ord.orderNumber || ord._id?.toString().slice(-6)}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                ord.status === 'PREPARING' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {ord.status}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              <div className="font-semibold text-slate-700">{ord.businessName || 'Unknown business'}</div>
              <div className="text-[11px] text-slate-400">Table: {ord.tableName || 'Takeaway'}</div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900">Total: {formatCurrency((ord.total ?? 0) * 100)}</span>
              <button
                onClick={() => toast.success(`Order #${ord.orderNumber} moved to the next step`)}
                className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
              >
                Next Step →
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default GlobalKitchenMonitor;
