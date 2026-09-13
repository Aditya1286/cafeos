import React from 'react';
import EmptyState from '../../ui/EmptyState';
import { toast } from '../../../utils/toast';
import { SubscriptionPlan } from '../../../types';

interface SubscriptionPlansPanelProps {
  plans: SubscriptionPlan[];
}

export const SubscriptionPlansPanel = ({ plans }: SubscriptionPlansPanelProps) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xl font-extrabold text-slate-900">
          Multi-Tenant Subscription Plans
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Configure subscription tiers, table limits, and per-order fee rules
        </p>
      </div>
    </div>

    {plans.length === 0 ? (
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <EmptyState
          title="No subscription plans configured yet"
          description="Create a plan to start assigning it to businesses."
        />
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`p-6 rounded-3xl bg-white border ${
              plan.isPopular ? 'border-2 border-red-400 shadow-xl shadow-red-500/10' : 'border-slate-200 shadow-sm'
            } space-y-5 flex flex-col justify-between relative overflow-hidden`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-2xl tracking-wider">
                POPULAR
              </div>
            )}
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-lg">{plan.name}</h4>
              <p className="text-xs text-slate-500">{plan.description}</p>

              <div className="text-3xl font-black text-slate-900">
                ₹{plan.monthlyPricePaise / 100} <span className="text-xs font-normal text-slate-400">/ mo</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 font-semibold space-y-1.5">
                <div>⚡ Per-Order Fee: ₹{(plan.perOrderFeePaise || 200) / 100}</div>
                <div>🪑 Up to {plan.limits.maxTables} tables</div>
                <div>📋 Up to {plan.limits.maxMenuItems} menu items</div>
                {plan.limits.inventoryEnabled && <div>📦 Inventory tracking included</div>}
                {plan.limits.analyticsAdvanced && <div>📈 Advanced analytics included</div>}
              </div>
            </div>

            <button
              onClick={() => toast.success(`Plan ${plan.name} settings saved!`)}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                plan.isPopular
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Edit Plan Pricing
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default SubscriptionPlansPanel;
