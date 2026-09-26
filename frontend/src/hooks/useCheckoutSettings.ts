import { useCallback, useEffect, useState } from 'react';
import checkoutSettingsService from '../services/dashboard/checkout';
import { CheckoutSettings, SaveCredentialsPayload } from '../services/dashboard/checkout/types';
import { toast } from '../utils/toast';

/**
 * The owner's SMEPay online-checkout setup (Settings tab). Fetches only while `enabled` — i.e.
 * while the Settings tab is visible — and every action replaces the local state with the
 * server's fresh view, so the card always shows exactly what the backend enforces.
 */
export const useCheckoutSettings = (enabled: boolean) => {
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await checkoutSettingsService.getSettings();
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch checkout settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  const startOnboarding = async () => {
    setOnboarding(true);
    try {
      const res = await checkoutSettingsService.startOnboarding();
      setSettings(res.data);
      toast.success('SMEPay account created — complete KYC to continue.');
      if (res.data.account.kycUrl) window.open(res.data.account.kycUrl, '_blank', 'noopener');
    } catch (err: any) {
      toast.error(err.message || 'Could not create your SMEPay account.');
    } finally {
      setOnboarding(false);
    }
  };

  // Resolves true when SMEPay accepted the credentials, so the form can clear the secret field.
  const saveCredentials = async (payload: SaveCredentialsPayload): Promise<boolean> => {
    setSavingCredentials(true);
    try {
      const res = await checkoutSettingsService.saveCredentials(payload);
      setSettings(res.data);
      toast.success('SMEPay account connected.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not verify these SMEPay credentials.');
      return false;
    } finally {
      setSavingCredentials(false);
    }
  };

  const setCheckoutEnabled = async (next: boolean) => {
    setTogglingEnabled(true);
    try {
      const res = await checkoutSettingsService.setEnabled(next);
      setSettings(res.data);
      toast.success(
        next ? 'Online checkout is now live for customers.' : 'Online checkout turned off.',
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not update online checkout.');
    } finally {
      setTogglingEnabled(false);
    }
  };

  return {
    settings,
    loading,
    onboarding,
    savingCredentials,
    togglingEnabled,
    refresh,
    startOnboarding,
    saveCredentials,
    setCheckoutEnabled,
  };
};

export type CheckoutSettingsState = ReturnType<typeof useCheckoutSettings>;
