import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import EmptyState from '@/atoms/EmptyState';
import { SubscriptionPlan } from '@/types';
import { EditPlanModal } from '@/organisms/super-admin/EditPlanModal';

interface SubscriptionPlansPanelProps {
  plans: SubscriptionPlan[];
  onPlansChanged: () => void;
}

export const SubscriptionPlansPanel = ({ plans, onPlansChanged }: SubscriptionPlansPanelProps) => {
  // undefined = closed, null = create mode, a plan = edit mode
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null | undefined>(undefined);

  return (
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
        <button
          onClick={() => setEditingPlan(null)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <EmptyState
            title="No subscription plans configured yet"
            description="Create a plan to start assigning it to businesses."
            actionLabel="Create Plan"
            onAction={() => setEditingPlan(null)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`p-6 rounded-3xl bg-white border ${
                plan.isPopular ? 'border-2 border-red-400 shadow-xl shadow-red-500/10' : 'border-slate-200 shadow-sm'
              } space-y-5 flex flex-col justify-between relative overflow-hidden ${plan.status === 'DISABLED' ? 'opacity-60' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-2xl tracking-wider">
                  POPULAR
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-lg">{plan.name}</h4>
                  {plan.status === 'DISABLED' && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black">DISABLED</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{plan.description}</p>

                <div className="text-3xl font-black text-slate-900">
                  ₹{plan.monthlyPricePaise / 100} <span className="text-xs font-normal text-slate-400">/ mo</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  {plan.subscriberCount ?? 0} business{plan.subscriberCount === 1 ? '' : 'es'} subscribed
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
                onClick={() => setEditingPlan(plan)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                  plan.isPopular
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Edit Plan
              </button>
            </div>
          ))}
        </div>
      )}

      <EditPlanModal
        plan={editingPlan}
        onClose={() => setEditingPlan(undefined)}
        onSaved={onPlansChanged}
      />
    </div>
  );
};

export default SubscriptionPlansPanel;
