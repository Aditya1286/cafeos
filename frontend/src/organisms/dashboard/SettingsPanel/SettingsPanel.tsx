import { Copy, Check, ShieldCheck, QrCode, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { APP_NAME } from '@/constants/app';
import { GST_ENABLED_SLABS, isGstSlab } from '@/constants/gst';
import { inputCls } from '@/molecules/FormField';
import { DashboardSubscriptionInfo, MySubscriptionStatus, SubscriptionPlan } from '@/types';
import { PlanUpgradePanel } from '@/organisms/dashboard/PlanUpgradePanel';
import { CheckoutSettingsCard } from '@/organisms/dashboard/CheckoutSettingsCard';
import { SMEPAY_CHECKOUT_ENABLED } from '@/constants/features';
import { CheckoutSettingsState } from '@/hooks/useCheckoutSettings';

interface SettingsPanelProps {
  business: any;
  subscription: DashboardSubscriptionInfo | null;
  upiVpaInput: string;
  setUpiVpaInput: (v: string) => void;
  savingUpiVpa: boolean;
  onSaveUpiVpa: () => void;
  savingTaxRate: boolean;
  onSaveTaxRate: (rate: number) => void;
  publicMenuUrl: string;
  copiedUrl: boolean;
  onCopyMenuUrl: () => void;
  subscriptionStatus: MySubscriptionStatus | null;
  subscriptionPlans: SubscriptionPlan[];
  loadingSubscription: boolean;
  requestingPlanId: string | null;
  markingUpgradePaid: boolean;
  cancellingUpgrade: boolean;
  onRequestUpgrade: (planId: string, billingCycle: 'MONTHLY' | 'ANNUAL') => void;
  onMarkUpgradePaid: (utr?: string) => void;
  onCancelUpgrade: () => void;
  checkout: CheckoutSettingsState;
}

export const SettingsPanel = ({
  business,
  subscription,
  upiVpaInput,
  setUpiVpaInput,
  savingUpiVpa,
  onSaveUpiVpa,
  savingTaxRate,
  onSaveTaxRate,
  publicMenuUrl,
  copiedUrl,
  onCopyMenuUrl,
  subscriptionStatus,
  subscriptionPlans,
  loadingSubscription,
  requestingPlanId,
  markingUpgradePaid,
  cancellingUpgrade,
  onRequestUpgrade,
  onMarkUpgradePaid,
  onCancelUpgrade,
  checkout,
}: SettingsPanelProps) => {
  const currentTaxRate: number = business?.taxRatePercentage ?? 0;
  const taxEnabled = currentTaxRate > 0;
  // A rate saved before the GST 2.0 slabs were enforced (e.g. 12%) keeps applying until changed.
  const legacyTaxRate = taxEnabled && !isGstSlab(currentTaxRate);

  const handleToggleTax = () => {
    onSaveTaxRate(taxEnabled ? 0 : GST_ENABLED_SLABS[0].rate);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md">
                {business?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {business?.name || 'The Artisan Roastery'}
                </h2>
                <div className="text-xs text-slate-400 font-semibold flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                    ACTIVE BUSINESS
                  </span>
                  <span>Slug: /c/{business?.slug}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onCopyMenuUrl}
              className="px-3.5 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 text-xs font-black transition-all flex items-center gap-1.5"
            >
              {copiedUrl ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedUrl ? 'Copied!' : 'Copy Menu URL'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Address</span>
              <div className="text-xs font-extrabold text-slate-800">
                {business?.address || 'Bandra West, Mumbai'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">
                Contact Phone
              </span>
              <div className="text-xs font-extrabold text-slate-800">
                {business?.phone || '+91 9876501234'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">
                Opening Hours
              </span>
              <div className="text-xs font-extrabold text-slate-800">
                {business?.openingTime || '08:00'} – {business?.closingTime || '23:00'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Currency</span>
              <div className="text-xs font-extrabold text-slate-800">
                {business?.currency || 'INR'} (₹)
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400">
                  GST / Tax on Orders
                </label>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {taxEnabled
                    ? 'New orders are taxed at the rate below, on top of the item total.'
                    : 'Currently off — new orders are charged item total only, no tax added.'}
                </p>
              </div>
              <button
                onClick={handleToggleTax}
                disabled={savingTaxRate}
                className={`shrink-0 relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
                  taxEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                title={
                  taxEnabled ? 'GST enabled — click to disable' : 'GST disabled — click to enable'
                }
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    taxEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {taxEnabled && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  {GST_ENABLED_SLABS.map(({ rate, hint }) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => rate !== currentTaxRate && onSaveTaxRate(rate)}
                      disabled={savingTaxRate}
                      className={`p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                        rate === currentTaxRate
                          ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`text-sm font-black ${rate === currentTaxRate ? 'text-emerald-700' : 'text-slate-800'}`}
                      >
                        {rate}%
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">
                        {hint}
                      </div>
                    </button>
                  ))}
                </div>
                {legacyTaxRate && (
                  <p className="text-[11px] font-bold text-amber-600">
                    Orders are currently taxed at {currentTaxRate}%, which is no longer a GST slab
                    for restaurants. Pick 5% or 18%.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">
              UPI ID (for customer online payments)
            </label>
            <p className="text-[11px] text-slate-400 font-medium">
              Shown to customers as a payment QR/link when they choose "Online" at checkout. Leave
              blank to only accept cash for now.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={upiVpaInput}
                onChange={(e) => setUpiVpaInput(e.target.value)}
                placeholder="yourbusiness@okhdfcbank"
                className={inputCls + ' flex-1'}
              />
              <button
                onClick={onSaveUpiVpa}
                disabled={savingUpiVpa || upiVpaInput.trim() === (business?.upiVpa || '')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all shrink-0"
              >
                {savingUpiVpa ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {SMEPAY_CHECKOUT_ENABLED && (
          <CheckoutSettingsCard
            settings={checkout.settings}
            loading={checkout.loading}
            onboarding={checkout.onboarding}
            savingCredentials={checkout.savingCredentials}
            togglingEnabled={checkout.togglingEnabled}
            onStartOnboarding={checkout.startOnboarding}
            onSaveCredentials={checkout.saveCredentials}
            onSetEnabled={checkout.setCheckoutEnabled}
          />
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-black text-slate-900">{APP_NAME} Subscription Plan</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-500 text-white font-extrabold text-xs shadow-sm">
              {subscription?.planName
                ? `${subscription.planName.toUpperCase()} PLAN`
                : 'NO ACTIVE PLAN'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Dining Tables</span>
              <div className="text-lg font-black text-slate-900">
                {subscription
                  ? `${subscription.usage.tables} / ${subscription.limits.maxTables}`
                  : '—'}
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

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Our Fee per Order
              </span>
              <div className="text-lg font-black text-orange-600">
                {business?.commissionRatePercentage ?? 3}%
              </div>
            </div>
          </div>
        </div>

        <PlanUpgradePanel
          business={business}
          subscriptionStatus={subscriptionStatus}
          subscriptionPlans={subscriptionPlans}
          loadingSubscription={loadingSubscription}
          requestingPlanId={requestingPlanId}
          markingUpgradePaid={markingUpgradePaid}
          cancellingUpgrade={cancellingUpgrade}
          onRequestUpgrade={onRequestUpgrade}
          onMarkUpgradePaid={onMarkUpgradePaid}
          onCancelUpgrade={onCancelUpgrade}
        />
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-200 flex items-center justify-center mx-auto">
            <QrCode className="w-5 h-5" />
          </div>

          <div>
            <h3 className="text-base font-black text-slate-900">Your Menu QR Code</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Customers scan this to see your menu and order
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              This is your master QR — switch it on or off under Tables & QR.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block my-2 shadow-inner">
            <QRCodeSVG value={publicMenuUrl} size={150} />
          </div>

          <div className="space-y-2 pt-2">
            <a
              href={publicMenuUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs text-center transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>See What Customers See</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onCopyMenuUrl}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Menu Link</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
