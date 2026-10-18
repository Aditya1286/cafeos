import { ReactNode } from 'react';
import { CheckoutSettingsCard } from '@/organisms/dashboard/CheckoutSettingsCard';
import { CafeLookCardMobile } from '@/organisms/dashboard/CafeLookCard';
import { PlanUpgradePanel } from '@/organisms/dashboard/PlanUpgradePanel';
import { SMEPAY_CHECKOUT_ENABLED, FEES_AND_PAYMENTS_ENABLED } from '@/constants/features';
import { GstinField } from './GstinField';
import { SettingsPanelProps } from './SettingsPanel';
import {
  BusinessHeader,
  BusinessDetails,
  TaxSettings,
  UpiSettings,
  SubscriptionCard,
  MenuQrCard,
  MenuBannerEditor,
} from './sections';

/** One tab of the Settings screen on a phone. */
export interface MobileSection {
  id: string;
  /** Kept short: it is the tab's label. */
  label: string;
  /** Leave out to always show the tab. */
  isVisible?: (props: SettingsPanelProps) => boolean;
  render: (props: SettingsPanelProps) => ReactNode;
}

/** A white card, as the desktop panel draws its groups of settings. */
const Card = ({ children }: { children: ReactNode }) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
    {children}
  </div>
);

/**
 * The tabs of the phone Settings screen, in order. To add a setting: write its component under
 * `./sections`, then add an entry here. The tab bar, the swiping and the order of the tabs all
 * follow this list; nothing else needs to change (the bar scrolls sideways past four tabs).
 */
export const MOBILE_SECTIONS: MobileSection[] = [
  {
    id: 'business',
    label: 'Business',
    render: (p) => (
      <Card>
        <BusinessHeader
          business={p.business}
          copiedUrl={p.copiedUrl}
          onCopyMenuUrl={p.onCopyMenuUrl}
          layout="stacked"
          savingLogo={p.savingLogo}
          onUploadLogo={p.onUploadLogo}
          onRemoveLogo={p.onRemoveLogo}
        />
        <BusinessDetails business={p.business} className="grid grid-cols-2 gap-2.5" />
        <MenuBannerEditor
          business={p.business}
          saving={p.savingCover}
          onUpload={p.onUploadCover}
          onRemove={p.onRemoveCover}
        />
      </Card>
    ),
  },
  {
    id: 'payments',
    label: 'Tax & pay',
    render: (p) => (
      <div className="space-y-4">
        <Card>
          <TaxSettings business={p.business} saving={p.savingTaxRate} onSave={p.onSaveTaxRate} />
          <GstinField value={p.business?.gstin} saving={p.savingGstin} onSave={p.onSaveGstin} />
          <UpiSettings
            business={p.business}
            value={p.upiVpaInput}
            onChange={p.setUpiVpaInput}
            saving={p.savingUpiVpa}
            onSave={p.onSaveUpiVpa}
          />
        </Card>
        {SMEPAY_CHECKOUT_ENABLED && (
          <CheckoutSettingsCard
            settings={p.checkout.settings}
            loading={p.checkout.loading}
            onboarding={p.checkout.onboarding}
            savingCredentials={p.checkout.savingCredentials}
            togglingEnabled={p.checkout.togglingEnabled}
            onStartOnboarding={p.checkout.startOnboarding}
            onSaveCredentials={p.checkout.saveCredentials}
            onSetEnabled={p.checkout.setCheckoutEnabled}
          />
        )}
      </div>
    ),
  },
  {
    id: 'look',
    label: 'Café look',
    // Only while café identity is on for this café (see the desktop panel).
    isVisible: (p) => !!p.business?.identity?.enabled,
    render: (p) => (
      <CafeLookCardMobile business={p.business} categories={p.categories} products={p.products} />
    ),
  },
  {
    id: 'qr',
    label: 'Menu QR',
    render: (p) => <MenuQrCard menuUrl={p.publicMenuUrl} onCopy={p.onCopyMenuUrl} />,
  },
  {
    id: 'plan',
    label: 'Plan',
    render: (p) => (
      <div className="space-y-4">
        <SubscriptionCard business={p.business} subscription={p.subscription} />
        {FEES_AND_PAYMENTS_ENABLED && (
          <PlanUpgradePanel
            business={p.business}
            subscriptionStatus={p.subscriptionStatus}
            subscriptionPlans={p.subscriptionPlans}
            loadingSubscription={p.loadingSubscription}
            requestingPlanId={p.requestingPlanId}
            markingUpgradePaid={p.markingUpgradePaid}
            cancellingUpgrade={p.cancellingUpgrade}
            onRequestUpgrade={p.onRequestUpgrade}
            onMarkUpgradePaid={p.onMarkUpgradePaid}
            onCancelUpgrade={p.onCancelUpgrade}
          />
        )}
      </div>
    ),
  },
];
