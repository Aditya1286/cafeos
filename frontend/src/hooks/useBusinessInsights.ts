import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { AdminBusinessInsights } from '../types';

/** Repeat-customer rate, true item margins, and real kitchen speed for one business,
 * looked up by id — the admin-side counterpart to what a business sees about itself. */
export const useBusinessInsights = (businessId: string | null) => {
  const [insights, setInsights] = useState<AdminBusinessInsights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setInsights(null);
      return;
    }
    setLoading(true);
    apiRequest(`/admin/analytics/business-insights?businessId=${businessId}`)
      .then((res) => setInsights(res?.data || null))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, [businessId]);

  return { insights, loading };
};
