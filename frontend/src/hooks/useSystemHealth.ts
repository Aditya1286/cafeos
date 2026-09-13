import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { SystemHealth } from '../types';

const POLL_INTERVAL_MS = 10_000;

/** Live-polls system health only while the System tab is actually open — no point
 *  hitting the Mongo admin command or holding an interval when nobody's looking. */
export const useSystemHealth = (enabled: boolean) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await apiRequest('/admin/system/health');
        if (!cancelled && res?.data) setSystemHealth(res.data);
      } catch (err) {
        console.error('Failed to fetch system health:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [enabled]);

  return { systemHealth, loading };
};
