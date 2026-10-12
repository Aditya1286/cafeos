import { useEffect, useState } from 'react';
import demoRequestsService from '../services/superAdmin/demoRequests';
import type {
  DemoRequest,
  UpdateDemoRequestPayload,
} from '../services/superAdmin/demoRequests/types';
import { toast } from '../utils/toast';

/** Super Admin's demo-request (lead) list from the marketing site's form. Same debounced-search,
 * paginated-list shape as useSupportDesk.ts; `enabled` is `activeTab === 'leads'`. */
export const useDemoRequests = (enabled: boolean) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);

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
        if (res.meta) setNewCount(res.meta.newCount || 0);
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

  const patchRequest = (id: string, patch: Partial<DemoRequest>) =>
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const updateRequest = async (id: string, payload: UpdateDemoRequestPayload) => {
    try {
      const res = await demoRequestsService.update(id, payload);
      patchRequest(id, res.data);
      // The "new" badge must drop as soon as a lead leaves NEW without a full refetch.
      if (payload.status) {
        const before = requests.find((r) => r.id === id)?.status;
        if (before === 'NEW' && payload.status !== 'NEW') setNewCount((c) => Math.max(0, c - 1));
        if (before !== 'NEW' && payload.status === 'NEW') setNewCount((c) => c + 1);
      }
      toast.success(payload.adminNote !== undefined ? 'Note saved' : 'Status updated');
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
    newCount,
    updateRequest,
    refresh: fetchRequests,
  };
};
