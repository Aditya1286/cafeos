import { MySubscriptionStatus, DashboardSubscriptionInfo, SubscriptionPlan } from '@/types';
import { PlanUpgradePanel } from '@/organisms/dashboard/PlanUpgradePanel';
import { CheckoutSettingsCard } from '@/organisms/dashboard/CheckoutSettingsCard';
import { CafeLookCard } from '@/organisms/dashboard/CafeLookCard';
import { SMEPAY_CHECKOUT_ENABLED, FEES_AND_PAYMENTS_ENABLED } from '@/constants/features';
import { CheckoutSettingsState } from '@/hooks/useCheckoutSettings';
import { GstinField } from './GstinField';
import {
  BusinessHeader,
  BusinessDetails,
  TaxSettings,
  UpiSettings,
  SubscriptionCard,
  MenuQrCard,
  MenuBannerEditor,
} from './sections';

export interface SettingsPanelProps {
  business: any;
  subscription: DashboardSubscriptionInfo | null;
  upiVpaInput: string;
  setUpiVpaInput: (v: string) => void;
  savingUpiVpa: boolean;
  onSaveUpiVpa: () => void;
  savingGstin: boolean;
  onSaveGstin: (gstin: string) => Promise<boolean>;
  savingTaxRate: boolean;
  onSaveTaxRate: (rate: number) => void;
  publicMenuUrl: string;
  copiedUrl: boolean;
  onCopyMenuUrl: () => void;
  savingLogo: boolean;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
  savingCover: boolean;
  onUploadCover: (file: File) => void;
  onRemoveCover: () => void;
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
  /** The owner's menu, for the Café look preview. */
  categories: any[];
  products: any[];
}

export const SettingsPanel = ({
  business,
  subscription,
  upiVpaInput,
  setUpiVpaInput,
  savingUpiVpa,
  onSaveUpiVpa,
  savingGstin,
  onSaveGstin,
  savingTaxRate,
  onSaveTaxRate,
  publicMenuUrl,
  copiedUrl,
  onCopyMenuUrl,
  savingLogo,
  onUploadLogo,
  onRemoveLogo,
  savingCover,
  onUploadCover,
  onRemoveCover,
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
  categories,
  products,
}: SettingsPanelProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <BusinessHeader
          business={business}
          copiedUrl={copiedUrl}
          onCopyMenuUrl={onCopyMenuUrl}
          savingLogo={savingLogo}
          onUploadLogo={onUploadLogo}
          onRemoveLogo={onRemoveLogo}
        />
        <BusinessDetails business={business} />

        <MenuBannerEditor
          business={business}
          saving={savingCover}
          onUpload={onUploadCover}
          onRemove={onRemoveCover}
        />

        <TaxSettings business={business} saving={savingTaxRate} onSave={onSaveTaxRate} />

        <GstinField value={business?.gstin} saving={savingGstin} onSave={onSaveGstin} />

        <UpiSettings
          business={business}
          value={upiVpaInput}
          onChange={setUpiVpaInput}
          saving={savingUpiVpa}
          onSave={onSaveUpiVpa}
        />
      </div>

      {/* Only while café identity is on for this café: /auth/me reports `identity.enabled` as the platform switch AND the café's own. */}
      {business?.identity?.enabled && (
        <CafeLookCard business={business} categories={categories} products={products} />
      )}

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

      <SubscriptionCard business={business} subscription={subscription} />

      {FEES_AND_PAYMENTS_ENABLED && (
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
      )}
    </div>

    <div className="space-y-6">
      <MenuQrCard menuUrl={publicMenuUrl} onCopy={onCopyMenuUrl} />
    </div>
  </div>
);

export default SettingsPanel;
