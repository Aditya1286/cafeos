import { useEffect, useState } from 'react';
import superAdminAnalyticsService from '../services/superAdmin/analytics';
import { AdminAnalytics } from '../types';

/** Real revenue timeseries / payment-method breakdown / best-sellers / peak-hours for the chosen date range. */
export const useSuperAdminAnalytics = (dateRange: string) => {
  const [analyticsData, setAnalyticsData] = useState<AdminAnalytics | null>(null);

  const fetchAnalytics = async (range: string) => {
    const res = await superAdminAnalyticsService.getAnalytics(range).catch(() => null);
    if (res?.data) setAnalyticsData(res.data);
  };

  useEffect(() => {
    fetchAnalytics(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  return { analyticsData };
};
