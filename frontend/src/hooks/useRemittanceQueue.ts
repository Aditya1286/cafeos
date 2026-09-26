import { useEffect, useState } from 'react';
import remittancesService from '../services/superAdmin/remittances';
import { toast } from '../utils/toast';
import { AdminRemittanceRequest } from '../types';

/**
 * Cross-business remittance queue: every commission request in one place, so
 * settling collections doesn't require opening each business's finance
 * drawer individually. The pending count is kept fresh regardless of which
 * tab is open, since it feeds the nav badge.
 */
export const useRemittanceQueue = (activeTab: string) => {
  const [remittanceView, setRemittanceView] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const [remittanceRequests, setRemittanceRequests] = useState<AdminRemittanceRequest[]>([]);
  const [loadingRemittances, setLoadingRemittances] = useState(false);
  const [pendingRemittancesCount, setPendingRemittancesCount] = useState(0);

  const fetchRemittanceRequests = async (status: 'UNPAID' | 'PAID') => {
    setLoadingRemittances(true);
    try {
      const res = await remittancesService.list(status);
      setRemittanceRequests(res.data || []);
      if (status === 'UNPAID') setPendingRemittancesCount((res.data || []).length);
    } catch (err) {
      console.error('Failed to fetch remittance requests:', err);
    } finally {
      setLoadingRemittances(false);
    }
  };

  // Keep the nav badge accurate regardless of which tab is open
  useEffect(() => {
    fetchRemittanceRequests('UNPAID');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'remittances') fetchRemittanceRequests(remittanceView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, remittanceView]);

  const handleMarkRequestPaid = async (id: string) => {
    try {
      await remittancesService.pay(id);
      toast.success('Marked as paid — moved to the paid log');
      fetchRemittanceRequests(remittanceView);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as paid');
    }
  };

  const handleUnmarkRequestPaid = async (id: string) => {
    try {
      await remittancesService.unpay(id);
      toast.success('Reverted to unpaid');
      fetchRemittanceRequests(remittanceView);
    } catch (err: any) {
      toast.error(err.message || 'Failed to revert');
    }
  };

  return {
    remittanceView,
    setRemittanceView,
    remittanceRequests,
    loadingRemittances,
    pendingRemittancesCount,
    handleMarkRequestPaid,
    handleUnmarkRequestPaid,
  };
};
