import { useEffect, useState } from 'react';
import ordersService from '../services/dashboard/orders';
import { RefundInsights } from '../types';

/** Search, filter, and paginate the "Refunds & Cancellations" tab, plus its precomputed insight cards — search box debounced 300ms, same pattern as useOrderHistory. */
export const useRefundsAndCancellations = (enabled: boolean) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<RefundInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersService.listRefunds({
        page: pagination.page,
        limit: pagination.limit,
        q: debouncedQuery || undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined
      });
      if (res.success) {
        setOrders(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch refunds & cancellations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await ordersService.refundInsights();
      setInsights(res.data || null);
    } catch (err) {
      console.error('Failed to fetch refund insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (enabled) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedQuery, paymentStatusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    if (enabled) fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const patchOrder = (orderId: string, patch: Record<string, any>) => {
    setOrders(prev => prev.map(o => ((o._id === orderId || o.orderId === orderId) ? { ...o, ...patch } : o)));
  };

  const refresh = () => {
    fetchOrders();
    fetchInsights();
  };

  return {
    searchQuery, setSearchQuery,
    paymentStatusFilter, setPaymentStatusFilter,
    orders, patchOrder,
    pagination, setPagination,
    loading,
    insights, loadingInsights,
    refresh,
  };
};
