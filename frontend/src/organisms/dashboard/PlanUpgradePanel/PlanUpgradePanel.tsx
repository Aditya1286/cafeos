import React, { useState } from 'react';
import { Check, Sparkles, Wallet, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { UpiAppButtons } from '@/molecules/Payments/UpiAppButtons';
import { UpiQrFallback } from '@/molecules/Payments/UpiQrFallback';
import { isMobileDevice } from '@/utils/device';
import { formatCurrency } from '@/utils/money';
import { MySubscriptionStatus, SubscriptionPlan } from '@/types';
import { INVENTORY_ENABLED } from '@/constants/features';

interface PlanUpgradePanelProps {
  business: any;
  subscriptionStatus: MySubscriptionStatus | null;
  subscriptionPlans: SubscriptionPlan[];
  loadingSubscription: boolean;
  requestingPlanId: string | null;
  markingUpgradePaid: boolean;
  cancellingUpgrade: boolean;
  onRequestUpgrade: (planId: string, billingCycle: 'MONTHLY' | 'ANNUAL') => void;
  onMarkUpgradePaid: (utr?: string) => void;
  onCancelUpgrade: () => void;
}

const CompleteUpgradeCard: React.FC<{
  business: any;
  status: MySubscriptionStatus;
  markingUpgradePaid: boolean;
  cancellingUpgrade: boolean;
  onMarkUpgradePaid: (utr?: string) => void;
  onCancelUpgrade: () => void;
}> = ({ business, status, markingUpgradePaid, cancellingUpgrade, onMarkUpgradePaid, onCancelUpgrade }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [utr, setUtr] = useState('');
  const [justClaimed, setJustClaimed] = useState(false);

  const request = status.pendingRequest!;
  const plan = typeof request.planId === 'string' ? null : request.planId;
  const amount = request.amountPaise / 100;
  const payeeVpa = status.platformUpiVpa;
  const payeeName = status.platformPayeeName;
  const transactionRef = business?.slug || business?._id || 'plan-upgrade';

  const handleConfirm = () => {
    onMarkUpgradePaid(utr.trim() || undefined);
    setShowConfirm(false);
    setJustClaimed(true);
    setUtr('');
  };

  if (justClaimed || request.merchantMarkedPaidAt) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="text-xs font-black text-emerald-700">Thanks — noted</p>
          <p className="text-[11px] text-emerald-600">We'll confirm receipt and activate the {plan?.name || 'requested'} plan shortly.</p>
        </div>
        <button
          type="button"
          onClick={onCancelUpgrade}
          disabled={cancellingUpgrade}
          className="w-full py-2 text-slate-400 font-bold text-[11px] hover:text-slate-600 transition-all disabled:opacity-50"
        >
          Cancel this request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-orange-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Complete your upgrade to {plan?.name || 'the new plan'}</h3>
            <p className="text-[11px] text-slate-500 font-medium">{formatCurrency(request.amountPaise)} · {request.billingCycle === 'ANNUAL' ? 'billed annually' : 'billed monthly'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancelUpgrade}
          disabled={cancellingUpgrade}
          title="Cancel this request"
          className="w-7 h-7 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-xs">
        {isMobileDevice() ? (
          <UpiAppButtons payeeVpa={payeeVpa} payeeName={payeeName} amount={amount} transactionRef={transactionRef} />
        ) : (
          <UpiQrFallback payeeVpa={payeeVpa} payeeName={payeeName} amount={amount} transactionRef={transactionRef} />
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[11px] hover:bg-slate-50 transition-all"
      >
        I've paid this
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !markingUpgradePaid && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-8 h-8 text-orange-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Confirm your payment</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                UPI doesn't tell us automatically — this lets our team know to check for your payment.
              </p>
            </div>

            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="UPI reference number (optional — helps us find it faster)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
            />

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={markingUpgradePaid}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                Yes, I've paid {formatCurrency(request.amountPaise)}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={markingUpgradePaid}
                className="w-full py-2 text-slate-400 font-bold text-[11px] hover:text-slate-600 transition-all"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PlanUpgradePanel = ({
  business, subscriptionStatus, subscriptionPlans, loadingSubscription,
  requestingPlanId, markingUpgradePaid, cancellingUpgrade,
  onRequestUpgrade, onMarkUpgradePaid, onCancelUpgrade,
}: PlanUpgradePanelProps) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  if (loadingSubscription || !subscriptionStatus) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="py-10 text-center text-xs text-slate-400 font-semibold">
          {loadingSubscription ? 'Loading plans…' : 'No data yet.'}
        </div>
      </div>
    );
  }

  const currentPlanCode = subscriptionStatus.currentPlan?.code;
  const pending = subscriptionStatus.pendingRequest;
  const pendingPlanId = pending && typeof pending.planId !== 'string' ? pending.planId._id : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">Change your plan</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Pick a plan and pay us directly — we'll activate it once we confirm receipt.
          </p>
        </div>
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold shrink-0">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-4 py-2 rounded-xl transition-all ${billingCycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('ANNUAL')}
            className={`px-4 py-2 rounded-xl transition-all ${billingCycle === 'ANNUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {subscriptionPlans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const isPendingThis = pendingPlanId === plan._id;
          const pricePaise = billingCycle === 'ANNUAL' ? plan.annualPricePaise : plan.monthlyPricePaise;
          return (
            <div
              key={plan._id}
              className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 relative overflow-hidden ${
                isCurrent ? 'border-2 border-emerald-400 bg-emerald-50/40' : plan.isPopular ? 'border-2 border-orange-300' : 'border-slate-200'
              }`}
            >
              {plan.isPopular && !isCurrent && (
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> POPULAR
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-sm">{plan.name}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{plan.description}</p>
                <div className="text-2xl font-black text-slate-900">
                  {formatCurrency(pricePaise)} <span className="text-[10px] font-normal text-slate-400">/ {billingCycle === 'ANNUAL' ? 'yr' : 'mo'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold space-y-1 pt-1">
                  <div>Up to {plan.limits.maxTables} tables · {plan.limits.maxMenuItems} menu items</div>
                  {INVENTORY_ENABLED && plan.limits.inventoryEnabled && <div>Inventory tracking included</div>}
                  {plan.limits.analyticsAdvanced && <div>Detailed sales reports included</div>}
                </div>
              </div>

              {isCurrent ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-black text-[11px] flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Current plan
                </div>
              ) : (
                <button
                  onClick={() => onRequestUpgrade(plan._id, billingCycle)}
                  disabled={requestingPlanId === plan._id || isPendingThis}
                  className={`w-full py-2.5 rounded-xl font-bold text-[11px] transition-colors disabled:opacity-50 ${
                    isPendingThis ? 'bg-orange-100 text-orange-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isPendingThis ? 'Request pending' : requestingPlanId === plan._id ? 'Requesting…' : 'Request this plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pending && (
        <CompleteUpgradeCard
          business={business}
          status={subscriptionStatus}
          markingUpgradePaid={markingUpgradePaid}
          cancellingUpgrade={cancellingUpgrade}
          onMarkUpgradePaid={onMarkUpgradePaid}
          onCancelUpgrade={onCancelUpgrade}
        />
      )}
    </div>
  );
};

export default PlanUpgradePanel;
