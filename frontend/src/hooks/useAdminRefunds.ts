import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { AdminRefundInsights } from '../types';

/** Admin-scoped mirror of useRefundsAndCancellations — adds a businessId filter so a super
 * admin can drill into one business's refunds, or leave it unset to see the whole platform. */
export const useAdminRefunds = (enabled: boolean) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [businessId, setBusinessId] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AdminRefundInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = `/admin/refunds?page=${pagination.page}&limit=${pagination.limit}`;
      if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
      if (businessId) url += `&businessId=${businessId}`;
      if (paymentStatusFilter !== 'ALL') url += `&paymentStatus=${paymentStatusFilter}`;
      const res = await apiRequest(url);
      if (res.success) {
        setOrders(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch admin refunds & cancellations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      let url = '/admin/refunds/insights';
      if (businessId) url += `?businessId=${businessId}`;
      const res = await apiRequest(url);
      setInsights(res.data || null);
    } catch (err) {
      console.error('Failed to fetch admin refund insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (enabled) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedQuery, businessId, paymentStatusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    if (enabled) fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, businessId]);

  const patchOrder = (orderId: string, patch: Record<string, any>) => {
    setOrders(prev => prev.map(o => ((o._id === orderId || o.orderId === orderId) ? { ...o, ...patch } : o)));
  };

  const refresh = () => {
    fetchOrders();
    fetchInsights();
  };

  const selectBusiness = (id: string) => {
    setBusinessId(id);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return {
    searchQuery, setSearchQuery,
    businessId, setBusinessId: selectBusiness,
    paymentStatusFilter, setPaymentStatusFilter,
    orders, patchOrder,
    pagination, setPagination,
    loading,
    insights, loadingInsights,
    refresh,
  };
};
