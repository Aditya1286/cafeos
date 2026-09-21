import { useEffect, useState } from 'react';
import superAdminAnalyticsService from '../services/superAdmin/analytics';
import { BusinessHourlyHeatmap } from '../types';

/** Day-of-week x hour-of-day revenue heatmap for a single business (last 90 days). */
export const useBusinessHourlyHeatmap = (businessId: string | null) => {
  const [heatmap, setHeatmap] = useState<BusinessHourlyHeatmap | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setHeatmap(null);
      return;
    }
    setLoading(true);
    superAdminAnalyticsService.getBusinessHeatmap(businessId)
      .then((res) => setHeatmap(res?.data || null))
      .catch(() => setHeatmap(null))
      .finally(() => setLoading(false));
  }, [businessId]);

  return { heatmap, loading };
};
