import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from '../utils/toast';

/** Super Admin's support desk — the ticket queue and the SUPER_ADMIN call-availability
 * roster, combined since both live under the same dashboard tab. Mirrors useAdminRefunds.ts'
 * debounced-search/paginated-list pattern for the ticket half. */
export const useSupportDesk = (enabled: boolean) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);

  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let url = `/admin/support/tickets?page=${pagination.page}&limit=${pagination.limit}`;
      if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      const res = await apiRequest(url);
      if (res.success) {
        setTickets(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.meta) setNeedsAttentionCount(res.meta.needsAttentionCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await apiRequest('/admin/support/agents');
      setAgents(res.data || []);
    } catch (err) {
      console.error('Failed to fetch call agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (enabled) fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedQuery, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    if (enabled) fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    socket.emit('join_admin_support_room');
    socket.on('support_ticket:new', () => fetchTickets());
    socket.on('support_ticket:updated', (updated: any) => {
      setTickets(prev => prev.map(t => (t._id === updated.id ? { ...t, ...updated } : t)));
    });
    return () => {
      socket.off('support_ticket:new');
      socket.off('support_ticket:updated');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const patchTicket = (ticketId: string, patch: any) => {
    setTickets(prev => prev.map(t => (t._id === ticketId ? { ...t, ...patch } : t)));
  };

  const assignToSelf = async (ticketId: string) => {
    try {
      const res = await apiRequest(`/admin/support/tickets/${ticketId}/assign`, 'PUT');
      patchTicket(ticketId, res.data);
      toast.success(res.message || 'Assigned to you');
    } catch (err: any) {
      toast.error(err.message || 'Could not assign ticket');
    }
  };

  const escalate = async (ticketId: string) => {
    try {
      const res = await apiRequest(`/admin/support/tickets/${ticketId}/escalate`, 'PUT');
      patchTicket(ticketId, res.data);
      toast.success(res.message || 'Ticket escalated');
    } catch (err: any) {
      toast.error(err.message || 'Could not escalate ticket');
    }
  };

  const resolve = async (ticketId: string, resolutionNote: string) => {
    try {
      const res = await apiRequest(`/admin/support/tickets/${ticketId}/resolve`, 'PUT', { resolutionNote });
      patchTicket(ticketId, res.data);
      toast.success(res.message || 'Ticket resolved');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not resolve ticket');
      return false;
    }
  };

  const toggleMyAvailability = async () => {
    try {
      setTogglingAvailability(true);
      const res = await apiRequest('/admin/support/agents/me/toggle-call-availability', 'PUT');
      await fetchAgents();
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || 'Could not update availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    tickets, pagination, setPagination, loading, needsAttentionCount,
    refresh: fetchTickets,
    assignToSelf, escalate, resolve,
    agents, loadingAgents, togglingAvailability, toggleMyAvailability,
  };
};
