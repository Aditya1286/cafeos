import { useEffect, useState } from 'react';
import subscriptionRequestsService from '../services/superAdmin/subscriptionRequests';
import { toast } from '../utils/toast';
import { AdminSubscriptionRequest, SubscriptionRequestStatus } from '../types';

/**
 * Cross-business subscription upgrade queue — every self-service plan-change request in one
 * place. The pending count is kept fresh regardless of which tab is open, since it feeds a nav badge.
 */
export const useSubscriptionRequests = (activeTab: string) => {
  const [requestsView, setRequestsView] = useState<SubscriptionRequestStatus>('PENDING');
  const [subscriptionRequests, setSubscriptionRequests] = useState<AdminSubscriptionRequest[]>([]);
  const [loadingSubscriptionRequests, setLoadingSubscriptionRequests] = useState(false);
  const [pendingSubscriptionRequestsCount, setPendingSubscriptionRequestsCount] = useState(0);

  const fetchSubscriptionRequests = async (status: SubscriptionRequestStatus) => {
    setLoadingSubscriptionRequests(true);
    try {
      const res = await subscriptionRequestsService.list(status);
      setSubscriptionRequests(res.data || []);
      if (status === 'PENDING') setPendingSubscriptionRequestsCount((res.data || []).length);
    } catch (err) {
      console.error('Failed to fetch subscription requests:', err);
    } finally {
      setLoadingSubscriptionRequests(false);
    }
  };

  // Keep the nav badge accurate regardless of which tab is open
  useEffect(() => {
    fetchSubscriptionRequests('PENDING');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'plans') fetchSubscriptionRequests(requestsView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, requestsView]);

  const handleApproveRequest = async (id: string) => {
    try {
      const res = await subscriptionRequestsService.approve(id);
      toast.success(res.message || 'Request approved');
      fetchSubscriptionRequests(requestsView);
    } catch (err: any) {
      toast.error(err.message || 'Could not approve request');
    }
  };

  const handleRejectRequest = async (id: string, reason?: string) => {
    try {
      await subscriptionRequestsService.reject(id, reason);
      toast.success('Request rejected');
      fetchSubscriptionRequests(requestsView);
    } catch (err: any) {
      toast.error(err.message || 'Could not reject request');
    }
  };

  return {
    requestsView,
    setRequestsView,
    subscriptionRequests,
    loadingSubscriptionRequests,
    pendingSubscriptionRequestsCount,
    handleApproveRequest,
    handleRejectRequest,
  };
};
