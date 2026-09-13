import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

export interface OrderHistoryFilters {
  query: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  dateFilter: 'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS';
}

const buildHistoryUrl = (filters: OrderHistoryFilters, page: number, limit: number) => {
  let url = `/orders?page=${page}&limit=${limit}`;
  if (filters.query) url += `&q=${encodeURIComponent(filters.query)}`;
  if (filters.status !== 'ALL') url += `&status=${filters.status}`;
  if (filters.paymentStatus !== 'ALL') url += `&paymentStatus=${filters.paymentStatus}`;
  if (filters.paymentMethod !== 'ALL') url += `&paymentMethod=${filters.paymentMethod}`;

  if (filters.dateFilter === 'TODAY') {
    const todayStr = new Date().toISOString().split('T')[0];
    url += `&startDate=${todayStr}T00:00:00.000Z`;
  } else if (filters.dateFilter === 'YESTERDAY') {
    const yest = new Date(Date.now() - 86400000);
    const yestStr = yest.toISOString().split('T')[0];
    url += `&startDate=${yestStr}T00:00:00.000Z&endDate=${yestStr}T23:59:59.999Z`;
  } else if (filters.dateFilter === '7DAYS') {
    const d = new Date(Date.now() - 7 * 86400000);
    url += `&startDate=${d.toISOString()}`;
  }
  return url;
};

/** Search, filter, and paginate the order history table — the search box is debounced 300ms. */
export const useOrderHistory = (enabled: boolean) => {
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<OrderHistoryFilters['dateFilter']>('ALL');
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(orderSearchQuery), 300);
    return () => clearTimeout(handler);
  }, [orderSearchQuery]);

  const fetchOrderHistory = async () => {
    try {
      setLoadingHistory(true);
      const url = buildHistoryUrl(
        { query: debouncedQuery, status: selectedStatusFilter, paymentStatus: selectedPaymentFilter, paymentMethod: selectedMethodFilter, dateFilter: selectedDateFilter },
        pagination.page,
        pagination.limit
      );
      const res = await apiRequest(url);
      if (res.success) {
        setOrderHistory(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (enabled) fetchOrderHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedQuery, selectedStatusFilter, selectedPaymentFilter, selectedMethodFilter, selectedDateFilter, pagination.page]);

  const patchOrder = (orderId: string, patch: Record<string, any>) => {
    setOrderHistory(prev => prev.map(o => ((o._id === orderId || o.orderId === orderId) ? { ...o, ...patch } : o)));
  };

  /** Mirrors a freshly-placed order into the currently-viewed history page, matching live order:new socket events. */
  const prependOrder = (order: any) => {
    setOrderHistory(prev => [order, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  };

  return {
    orderSearchQuery, setOrderSearchQuery,
    selectedStatusFilter, setSelectedStatusFilter,
    selectedPaymentFilter, setSelectedPaymentFilter,
    selectedMethodFilter, setSelectedMethodFilter,
    selectedDateFilter, setSelectedDateFilter,
    orderHistory, patchOrder, prependOrder,
    pagination, setPagination,
    loadingHistory,
    fetchOrderHistory,
  };
};
