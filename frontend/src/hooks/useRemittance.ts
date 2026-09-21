import { useEffect, useState } from 'react';
import remittanceService from '../services/dashboard/remittance';
import { toast } from '../utils/toast';

/** Fetches the financial ledger / remittance summary once, the first time the ledger tab becomes active. */
export const useRemittance = (activeTab: string) => {
  const [remittanceSummary, setRemittanceSummary] = useState<any>(null);
  const [loadingRemittance, setLoadingRemittance] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const fetchRemittanceSummary = async () => {
    try {
      setLoadingRemittance(true);
      const res = await remittanceService.getSummary();
      setRemittanceSummary(res.data || null);
    } catch (err) {
      console.error('Failed to fetch remittance summary:', err);
    } finally {
      setLoadingRemittance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledger' && !remittanceSummary) {
      fetchRemittanceSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Self-report that outstanding commission was paid via the platform's UPI QR. There's no
  // gateway webhook, so this never flips a period to PAID itself — a super admin still has to
  // confirm receipt. It just re-fetches so the "business says paid" badge shows immediately.
  const handleMarkRemittancePaid = async (utr?: string) => {
    setMarkingPaid(true);
    try {
      await remittanceService.markPaid(utr);
      await fetchRemittanceSummary();
      toast.success('Thanks — we\'ll confirm receipt and update your ledger shortly.');
    } catch (err: any) {
      toast.error(err.message || 'Could not record your payment.');
    } finally {
      setMarkingPaid(false);
    }
  };

  return { remittanceSummary, loadingRemittance, markingPaid, handleMarkRemittancePaid };
};
