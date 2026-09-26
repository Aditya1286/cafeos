import { useEffect, useState } from 'react';
import subscriptionsService from '../services/dashboard/subscriptions';
import { toast } from '../utils/toast';
import { MySubscriptionStatus, SubscriptionPlan } from '../types';

/** Owner-facing plan status + self-service upgrade flow. Fetched once, the first time the Settings tab becomes active. */
export const useSubscription = (activeTab: string) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<MySubscriptionStatus | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);
  const [markingUpgradePaid, setMarkingUpgradePaid] = useState(false);
  const [cancellingUpgrade, setCancellingUpgrade] = useState(false);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoadingSubscription(true);
      const [statusRes, plansRes] = await Promise.all([
        subscriptionsService.getStatus(),
        subscriptionsService.listPlans(),
      ]);
      setSubscriptionStatus(statusRes.data || null);
      setSubscriptionPlans(plansRes.data || []);
    } catch (err) {
      console.error('Failed to load subscription status:', err);
    } finally {
      setLoadingSubscription(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings' && !subscriptionStatus) {
      fetchSubscriptionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Asking for a plan never changes what's active — a super admin approving this (after
  // payment) does that. Requesting again before paying just updates the existing request.
  const handleRequestUpgrade = async (
    planId: string,
    billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
  ) => {
    setRequestingPlanId(planId);
    try {
      const res = await subscriptionsService.requestUpgrade(planId, billingCycle);
      toast.success(res.message || 'Upgrade requested');
      await fetchSubscriptionStatus();
    } catch (err: any) {
      toast.error(err.message || 'Could not request upgrade');
    } finally {
      setRequestingPlanId(null);
    }
  };

  // Self-report payment via the platform's UPI QR — same limitation as commission remittance,
  // no gateway, so this only flags the claim for a super admin to verify and approve.
  const handleMarkUpgradePaid = async (utr?: string) => {
    setMarkingUpgradePaid(true);
    try {
      await subscriptionsService.markUpgradePaid(utr);
      await fetchSubscriptionStatus();
      toast.success("Thanks — we'll confirm receipt and activate your plan shortly.");
    } catch (err: any) {
      toast.error(err.message || 'Could not record your payment.');
    } finally {
      setMarkingUpgradePaid(false);
    }
  };

  const handleCancelUpgrade = async () => {
    setCancellingUpgrade(true);
    try {
      await subscriptionsService.cancelUpgrade();
      await fetchSubscriptionStatus();
      toast.success('Upgrade request cancelled');
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel request');
    } finally {
      setCancellingUpgrade(false);
    }
  };

  return {
    subscriptionStatus,
    subscriptionPlans,
    loadingSubscription,
    requestingPlanId,
    markingUpgradePaid,
    cancellingUpgrade,
    handleRequestUpgrade,
    handleMarkUpgradePaid,
    handleCancelUpgrade,
  };
};
