import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, Lock } from 'lucide-react';
import { inputCls } from '@/molecules/FormField';
import { CheckoutSettings, SaveCredentialsPayload } from '@/services/dashboard/checkout/types';

interface CheckoutSettingsCardProps {
  settings: CheckoutSettings | null;
  loading: boolean;
  onboarding: boolean;
  savingCredentials: boolean;
  togglingEnabled: boolean;
  onStartOnboarding: () => void;
  onSaveCredentials: (payload: SaveCredentialsPayload) => Promise<boolean>;
  onSetEnabled: (enabled: boolean) => void;
}

const StepBadge = ({ n, done }: { n: number; done: boolean }) =>
  done ? (
    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
  ) : (
    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-500 flex items-center justify-center shrink-0">
      {n}
    </span>
  );

/**
 * SMEPay online checkout — the optional payment method where customers pay through the café's
 * own SMEPay account and the order reaches the kitchen only once the payment is confirmed. The
 * existing "Online" (direct UPI) and cash options keep working alongside it.
 */
export const CheckoutSettingsCard = ({
  settings,
  loading,
  onboarding,
  savingCredentials,
  togglingEnabled,
  onStartOnboarding,
  onSaveCredentials,
  onSetEnabled,
}: CheckoutSettingsCardProps) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    if (settings?.account.clientId) setClientId(settings.account.clientId);
  }, [settings?.account.clientId]);

  const header = (
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <div className="flex items-center gap-2.5">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-black text-slate-900">Online Checkout (SMEPay)</h3>
      </div>
      {settings?.checkoutAvailable && (
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
          LIVE
        </span>
      )}
    </div>
  );

  if (!settings) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        {header}
        <p className="text-xs text-slate-400 font-semibold">
          {loading ? 'Loading…' : 'Could not load checkout settings.'}
        </p>
      </div>
    );
  }

  if (!settings.checkoutAllowed) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        {header}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-500 font-medium">
            Let customers pay online and have orders reach your kitchen only once the payment is
            confirmed — no more checking your phone for UPI payments. Online checkout isn't enabled
            for your café yet; contact support to get access.
          </p>
        </div>
      </div>
    );
  }

  const { account } = settings;
  const connected = account.onboardingStatus === 'CONNECTED';
  const accountCreated = account.onboardingStatus !== 'NOT_STARTED' || !!account.smepayBusinessId;

  const handleSave = async () => {
    const ok = await onSaveCredentials({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    });
    if (ok) setClientSecret('');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
      {header}
      <p className="text-[11px] text-slate-400 font-medium">
        Customers pay through your own SMEPay account and the money settles straight to your bank.
        Orders paid this way arrive in the kitchen already marked paid. Direct UPI and
        pay-at-counter stay available.
      </p>

      {/* Step 1 — SMEPay account + KYC */}
      <div className="flex gap-3">
        <StepBadge n={1} done={accountCreated || connected} />
        <div className="flex-1 space-y-2">
          <p className="text-xs font-black text-slate-800">
            Create your SMEPay account & complete KYC
          </p>
          {account.kycUrl ? (
            <a
              href={account.kycUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 underline"
            >
              Open KYC page <ExternalLink className="w-3 h-3" />
            </a>
          ) : settings.partnerOnboardingAvailable && !connected ? (
            <button
              onClick={onStartOnboarding}
              disabled={onboarding}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
            >
              {onboarding ? 'Creating account…' : 'Create SMEPay Account'}
            </button>
          ) : (
            <p className="text-[11px] text-slate-400 font-medium">
              {connected ? 'Account connected.' : 'Already have an SMEPay account? Skip to step 2.'}
            </p>
          )}
          {account.lastError && !connected && (
            <p className="text-[11px] font-bold text-rose-600">{account.lastError}</p>
          )}
        </div>
      </div>

      {/* Step 2 — Wizard credentials */}
      <div className="flex gap-3">
        <StepBadge n={2} done={connected} />
        <div className="flex-1 space-y-2">
          <p className="text-xs font-black text-slate-800">Connect your SMEPay API keys</p>
          <p className="text-[11px] text-slate-400 font-medium">
            Find your Client ID and Client Secret in the SMEPay dashboard once KYC is approved. We
            verify them with SMEPay and store the secret encrypted.
          </p>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
            autoComplete="off"
            className={inputCls}
          />
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={
              account.hasClientSecret
                ? '•••••••• (saved — enter a new one to replace)'
                : 'Client Secret'
            }
            autoComplete="new-password"
            className={inputCls}
          />
          <button
            onClick={handleSave}
            disabled={savingCredentials || !clientId.trim() || !clientSecret.trim()}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
          >
            {savingCredentials ? 'Verifying…' : connected ? 'Update Keys' : 'Verify & Connect'}
          </button>
        </div>
      </div>

      {/* Step 3 — go live */}
      <div className="flex gap-3 items-start">
        <StepBadge n={3} done={settings.checkoutEnabled} />
        <div className="flex-1 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-slate-800">Offer online checkout to customers</p>
            <p className="text-[11px] text-slate-400 font-medium">
              {connected
                ? 'Shows a "Pay Online" option on your menu.'
                : 'Connect your SMEPay keys first.'}
            </p>
          </div>
          <button
            onClick={() => onSetEnabled(!settings.checkoutEnabled)}
            disabled={togglingEnabled || (!connected && !settings.checkoutEnabled)}
            className={`shrink-0 relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
              settings.checkoutEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
            title={
              settings.checkoutEnabled
                ? 'Online checkout on — click to turn off'
                : 'Online checkout off — click to turn on'
            }
            aria-pressed={settings.checkoutEnabled}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                settings.checkoutEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSettingsCard;
