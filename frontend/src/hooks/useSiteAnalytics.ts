import { useCallback, useEffect, useState } from 'react';
import siteAnalyticsService from '../services/superAdmin/siteAnalytics';
import type { SiteReport } from '../services/superAdmin/siteAnalytics/types';
import { toast } from '../utils/toast';

/**
 * The marketing site's own analytics, for the Reports tab. `range` is the date picker's preset
 * (today, yesterday, last_7_days, last_30_days), the same one the platform numbers use.
 */
export const useSiteAnalytics = (enabled: boolean, range: string) => {
  const [report, setReport] = useState<SiteReport | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await siteAnalyticsService.getReport(range);
      if (res.success && res.data) setReport(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Could not load website analytics.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { report, loading, refresh };
};
