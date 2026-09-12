
import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

interface UseOrderResult {
  order: any | null;
  loading: boolean;
  error: string | null;
}

const TERMINAL_STATUSES = ['PAID', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const POLL_INTERVAL_MS = 5000;

/**
 * Fetches the order once, then polls while it's still awaiting the
 * business's confirmation — so if the admin marks it paid on their
 * dashboard, this page updates on its own without the customer refreshing.
 */
export function useOrder(orderId: string | undefined): UseOrderResult {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await apiRequest(`/public/orders/${orderId}`);
      setOrder(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unable to load order.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!order || TERMINAL_STATUSES.includes(order.status)) return;
    const timer = setInterval(fetchOrder, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [order, fetchOrder]);

  return { order, loading, error };
}