import { ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/constants/app';
import { FEES_AND_PAYMENTS_ENABLED } from '@/constants/features';
import { DashboardSubscriptionInfo } from '@/types';

interface SubscriptionCardProps {
  business: any;
  subscription: DashboardSubscriptionInfo | null;
}

/** The current plan, and how much of its table and menu-item limits is used. */
export const SubscriptionCard = ({ business, subscription }: SubscriptionCardProps) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-brand-500" />
        <h3 className="text-sm font-black text-slate-900">{APP_NAME} Subscription Plan</h3>
      </div>
      <span className="px-3 py-1 rounded-full bg-brand-500 text-white font-extrabold text-xs shadow-sm">
        {subscription?.planName ? `${subscription.planName.toUpperCase()} PLAN` : 'NO ACTIVE PLAN'}
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Dining Tables</span>
        <div className="text-lg font-black text-slate-900">
          {subscription ? `${subscription.usage.tables} / ${subscription.limits.maxTables}` : '—'}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Menu Items</span>
        <div className="text-lg font-black text-slate-900">
          {subscription
            ? `${subscription.usage.menuItems} / ${subscription.limits.maxMenuItems}`
            : '—'}
        </div>
      </div>

      {FEES_AND_PAYMENTS_ENABLED && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Our Fee per Order</span>
          <div className="text-lg font-black text-brand-600">
            {business?.commissionRatePercentage ?? 3}%
          </div>
        </div>
      )}
    </div>
  </div>
);
