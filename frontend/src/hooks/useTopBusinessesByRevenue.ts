import { useEffect, useState } from 'react';
import superAdminAnalyticsService from '../services/superAdmin/analytics';
import { TopBusinessByRevenue } from '../types';

/** Businesses ranked by actual paid-order revenue in the last 90 days — NOT
 *  `lifetimeGMVPaise` (remittance-cycle based, can sit at 0 for an active business
 *  whose first billing period hasn't closed yet). */
export const useTopBusinessesByRevenue = (limit = 8) => {
  const [businesses, setBusinesses] = useState<TopBusinessByRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    superAdminAnalyticsService
      .getTopBusinesses(limit)
      .then((res) => setBusinesses(res?.data?.businesses || []))
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { businesses, loading };
};
