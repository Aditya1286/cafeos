import { useEffect, useState } from 'react';
import demoRequestsService from '../services/superAdmin/demoRequests';
import type {
  DemoRequest,
  DemoRequestStatus,
  DemoRequestStatusCounts,
  UpdateDemoRequestPayload,
} from '../services/superAdmin/demoRequests/types';
import { toast } from '../utils/toast';

const EMPTY_COUNTS: DemoRequestStatusCounts = {
  NEW: 0,
  CONTACTED: 0,
  TRIAL_STARTED: 0,
  WON: 0,
  LOST: 0,
};

const STATUS_NAME: Record<DemoRequestStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Called',
  TRIAL_STARTED: 'Trial started',
  WON: 'Won',
  LOST: 'Lost',
};

/** Super Admin's demo-request (lead) pipeline from the marketing site's quiz. Same debounced-search,
 * paginated-list shape as useSupportDesk.ts; `enabled` is `activeTab === 'leads'`. Opens on the
 * NEW tab: the people still waiting for a call. */
export const useDemoRequests = (enabled: boolean) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<DemoRequestStatusCounts>(EMPTY_COUNTS);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await demoRequestsService.list({
        page: pagination.page,
        limit: pagination.limit,
        q: debouncedQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      if (res.success) {
        setRequests(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.meta?.statusCounts) setStatusCounts(res.meta.statusCounts);
      }
    } catch (err) {
      console.error('Failed to fetch demo requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedQuery, statusFilter, pagination.page, pagination.limit]);

  const updateRequest = async (id: string, payload: UpdateDemoRequestPayload) => {
    const before = requests.find((r) => r.id === id);
    try {
      const res = await demoRequestsService.update(id, payload);
      const moved = payload.status && before && payload.status !== before.status;
      if (moved) {
        // The tab counts (and the nav badge, which is NEW) follow without a refetch, and a lead
        // moved out of the tab being viewed leaves it, like a card moved to another column.
        setStatusCounts((prev) => ({
          ...prev,
          [before.status]: Math.max(0, prev[before.status] - 1),
          [payload.status!]: prev[payload.status!] + 1,
        }));
        if (statusFilter !== 'ALL' && statusFilter !== payload.status) {
          setRequests((prev) => prev.filter((r) => r.id !== id));
          setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        } else {
          setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...res.data } : r)));
        }
        toast.success(`${before.brandName} moved to ${STATUS_NAME[payload.status!]}`);
      } else {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...res.data } : r)));
        toast.success(payload.adminNote !== undefined ? 'Note saved' : 'Saved');
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not update this request');
      return false;
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter: (status: string) => {
      setStatusFilter(status);
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    requests,
    pagination,
    setPagination,
    loading,
    statusCounts,
    newCount: statusCounts.NEW,
    updateRequest,
    refresh: fetchRequests,
  };
};
