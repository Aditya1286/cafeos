import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';
import { toast } from '../utils/toast';
import { getSocket } from '../services/socket';
import { DashboardAnalytics } from '../types';

interface UseOwnerDashboardDataOptions {
  /** Mirrors the same live order socket events into any other order list a caller keeps (e.g. the paginated order history table). */
  onOrderNew?: (order: any) => void;
  onOrderUpdated?: (patch: { orderId: string; orderStatus: string }) => void;
  onCustomerMarkedPaid?: (patch: { orderId: string; customerMarkedPaidAt: string }) => void;
}

/**
 * Loads every dataset the owner dashboard renders (business profile, live
 * orders, menu, tables, inventory, and backend-computed analytics), and keeps
 * `orders` in sync with the live order socket events. All KPI numbers shown
 * to the owner are derived from this data — nothing here is a UI placeholder.
 */
export const useOwnerDashboardData = (options: UseOwnerDashboardDataOptions = {}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newlyArrivedOrderId, setNewlyArrivedOrderId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const profileRes = await apiRequest('/auth/me');
      setBusiness(profileRes.data.business);

      const [ordersRes, catRes, prodRes, tblRes, invRes, analRes] = await Promise.all([
        apiRequest('/orders'),
        apiRequest('/menu/categories'),
        apiRequest('/menu/products'),
        apiRequest('/tables'),
        apiRequest('/inventory/items'),
        apiRequest('/analytics/dashboard')
      ]);

      setOrders(ordersRes.data || []);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setTables(tblRes.data || []);
      setInventoryItems(invRes.data || []);
      setAnalytics(analRes.data || null);

      if (profileRes.data.business?._id) {
        const socket = getSocket();
        socket.emit('join_business_room', profileRes.data.business._id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Kept in refs so the socket subscription below doesn't need to resubscribe
  // every time a caller passes a fresh inline callback.
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();
    socket.on('order:new', (newOrder: any) => {
      setOrders(prev => [newOrder, ...prev]);
      toast(`🔔 New order ${newOrder.orderNumber || newOrder.orderId} arrived!`);
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
      const arrivedId = newOrder._id || newOrder.orderId;
      setNewlyArrivedOrderId(arrivedId);
      setTimeout(() => setNewlyArrivedOrderId(prev => (prev === arrivedId ? null : prev)), 5000);
      callbacksRef.current.onOrderNew?.(newOrder);
    });
    socket.on('order:updated', (updated: any) => {
      setOrders(prev => prev.map(o => ((o._id === updated.orderId || o.orderId === updated.orderId) ? { ...o, orderStatus: updated.orderStatus } : o)));
      callbacksRef.current.onOrderUpdated?.(updated);
    });
    socket.on('order:customer_marked_paid', (updated: any) => {
      const patch = (o: any) => ((o._id === updated.orderId || o.orderId === updated.orderId) ? { ...o, customerMarkedPaidAt: updated.customerMarkedPaidAt } : o);
      setOrders(prev => prev.map(patch));
      toast(`💳 ${updated.orderNumber || 'An order'} — customer says they've paid`);
      callbacksRef.current.onCustomerMarkedPaid?.(updated);
    });

    return () => { socket.off('order:new'); socket.off('order:updated'); socket.off('order:customer_marked_paid'); };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!orderId) {
      toast.error('Missing order ID.');
      return;
    }
    try {
      await apiRequest(`/orders/${orderId}/status`, 'PUT', { status });
      setOrders(prev => prev.map(o => ((o._id === orderId || o.orderId === orderId) ? { ...o, orderStatus: status } : o)));
      toast.success(`Order status updated to ${status}`);
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const [savingUpiVpa, setSavingUpiVpa] = useState(false);
  const handleSaveUpiVpa = async (upiVpa: string) => {
    setSavingUpiVpa(true);
    try {
      await apiRequest('/business/settings', 'PUT', { upiVpa });
      setBusiness((prev: any) => (prev ? { ...prev, upiVpa } : prev));
      toast.success('UPI ID saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not save UPI ID');
    } finally {
      setSavingUpiVpa(false);
    }
  };

  const [savingTablesEnabled, setSavingTablesEnabled] = useState(false);
  const handleToggleTablesEnabled = async () => {
    const next = !(business?.tablesEnabled ?? true);
    setSavingTablesEnabled(true);
    try {
      await apiRequest('/business/settings', 'PUT', { tablesEnabled: next });
      setBusiness((prev: any) => (prev ? { ...prev, tablesEnabled: next } : prev));
      toast.success(next ? 'Tables enabled' : 'Tables disabled — orders no longer need a table');
    } catch (err: any) {
      toast.error(err.message || 'Could not update tables setting');
    } finally {
      setSavingTablesEnabled(false);
    }
  };

  return {
    orders, setOrders,
    categories,
    products,
    tables,
    inventoryItems,
    analytics,
    business,
    loading,
    newlyArrivedOrderId,
    fetchDashboardData,
    handleUpdateOrderStatus,
    savingUpiVpa, handleSaveUpiVpa,
    savingTablesEnabled, handleToggleTablesEnabled,
  };
};
