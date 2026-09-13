import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from '../utils/toast';
import { SuperAdminOverview, AdminBusinessSummary, SystemHealth } from '../types';

/**
 * Loads every platform-wide dataset the super admin overview renders (global
 * metrics, the registered business list with their financial snapshot, and
 * process/DB health), and keeps the live order stream in sync via socket
 * events. All numbers here come straight from `/admin/*` aggregations.
 */
export const useSuperAdminDashboardData = () => {
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusinessSummary[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const overviewRes = await apiRequest('/admin/overview').catch(() => null);
      if (overviewRes?.data) {
        setOverview(overviewRes.data);
        if (overviewRes.data.recentOrders?.length > 0) {
          setLiveOrders(overviewRes.data.recentOrders);
        }
      }
      const businessesRes = await apiRequest('/admin/businesses').catch(() => null);
      if (businessesRes?.data) setBusinesses(businessesRes.data);

      const healthRes = await apiRequest('/admin/system/health').catch(() => null);
      if (healthRes?.data) setSystemHealth(healthRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();
    socket.on('order_created', (newOrder: any) => {
      setLiveOrders((prev) => [newOrder, ...prev.slice(0, 7)]);
      toast(`⚡ New order #${newOrder.orderNumber || newOrder._id?.slice(-4)} arrived!`);
    });
    socket.on('order_updated', (updatedOrder: any) => {
      setLiveOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? { ...o, status: updatedOrder.orderStatus } : o)));
    });

    return () => {
      socket.off('order_created');
      socket.off('order_updated');
    };
  }, []);

  const handleToggleBusinessStatus = async (businessId: string, targetStatus: string) => {
    try {
      await apiRequest(`/admin/businesses/${businessId}/status`, 'PUT', { status: targetStatus });
      toast.success(`Business status updated to ${targetStatus}`);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update business status');
    }
  };

  const handleChangeBusinessPlan = async (businessId: string, planId: string) => {
    try {
      const res = await apiRequest(`/admin/businesses/${businessId}/plan`, 'PUT', { planId });
      toast.success(res.message || 'Plan updated');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change plan');
    }
  };

  return {
    overview,
    businesses,
    liveOrders,
    systemHealth,
    loading,
    fetchDashboardData,
    handleToggleBusinessStatus,
    handleChangeBusinessPlan,
  };
};
