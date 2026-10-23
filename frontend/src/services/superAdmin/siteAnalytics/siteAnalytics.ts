import { apiRequest } from '../../api';
import { SiteReportResponse } from './types';

/** `range` is a date picker preset: today, yesterday, last_7_days, last_30_days. */
export const getReport = (range: string): Promise<SiteReportResponse> =>
  apiRequest(`/admin/site-analytics?range=${encodeURIComponent(range)}`);
