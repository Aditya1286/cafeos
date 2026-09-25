import { useEffect, useState } from 'react';
import superAdminAnalyticsService from '../services/superAdmin/analytics';
import businessesService from '../services/superAdmin/businesses';
import { getSocket, joinAdminOrdersRoom, onReconnect } from '../services/socket';
import { toast } from '../utils/toast';
import { SuperAdminOverview, AdminBusinessSummary } from '../types';

/**
 * Loads every platform-wide dataset the super admin overview renders (global
 * metrics and the registered business list with their financial snapshot),
 * and keeps the live order stream in sync via socket events. All numbers
 * here come straight from `/admin/*` aggregations. System/DB health lives in
 * its own polling hook (useSystemHealth) since it needs to refresh on an
 * interval, not just once per dashboard load.
 */
const LIVE_FEED_SIZE = 10;

export const useSuperAdminDashboardData = () => {
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusinessSummary[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingDemoId, setUpdatingDemoId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const overviewRes = await superAdminAnalyticsService.getOverview().catch(() => null);
      if (overviewRes?.data) {
        setOverview(overviewRes.data);
        if (overviewRes.data.recentOrders?.length > 0) {
          setLiveOrders(overviewRes.data.recentOrders);
        }
      }
      const businessesRes = await businessesService.list().catch(() => null);
      if (businessesRes?.data) setBusinesses(businessesRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Platform-wide live feed: same row shape as the overview's recentOrders (see the
    // backend's utils/adminLiveOrder.ts), capped at the same 10 rows.
    const socket = getSocket();
    joinAdminOrdersRoom();
    socket.on('admin_order:new', (newOrder: any) => {
      setLiveOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)].slice(0, LIVE_FEED_SIZE));
      toast(`⚡ New order #${newOrder.orderNumber || newOrder._id?.slice(-4)} arrived!`);
    });
    socket.on('admin_order:updated', (updated: { _id: string; status: string }) => {
      setLiveOrders((prev) => prev.map((o) => (o._id === updated._id ? { ...o, status: updated.status } : o)));
    });

    // Orders placed or moved while disconnected never arrive as events — quietly re-read the
    // feed (not the whole dashboard, which would flash the loading state) after a reconnect.
    const stopResync = onReconnect(async () => {
      const res = await superAdminAnalyticsService.getOverview().catch(() => null);
      if (res?.data?.recentOrders) setLiveOrders(res.data.recentOrders);
    });

    return () => {
      socket.off('admin_order:new');
      socket.off('admin_order:updated');
      stopResync();
    };
  }, []);

  const handleToggleBusinessStatus = async (businessId: string, targetStatus: string) => {
    try {
      await businessesService.updateStatus(businessId, targetStatus);
      toast.success(`Business status updated to ${targetStatus}`);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update business status');
    }
  };

  const handleChangeBusinessPlan = async (businessId: string, planId: string) => {
    try {
      const res = await businessesService.updatePlan(businessId, planId);
      toast.success(res.message || 'Plan updated');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change plan');
    }
  };

  // Flip the flag locally right away so the badge/toggle respond instantly, then refetch — the
  // overview metrics change server-side once a business enters/leaves the demo set.
  const handleSetBusinessDemo = async (businessId: string, isDemo: boolean) => {
    setUpdatingDemoId(businessId);
    setBusinesses((prev) => prev.map((b) => (b._id === businessId ? { ...b, isDemo } : b)));
    try {
      const res = await businessesService.setDemo(businessId, isDemo);
      toast.success(res.message || (isDemo ? 'Marked as demo account' : 'Demo flag removed'));
      await fetchDashboardData();
    } catch (err: any) {
      setBusinesses((prev) => prev.map((b) => (b._id === businessId ? { ...b, isDemo: !isDemo } : b)));
      toast.error(err.message || 'Failed to update demo flag');
    } finally {
      setUpdatingDemoId(null);
    }
  };

  return {
    overview,
    businesses,
    liveOrders,
    loading,
    fetchDashboardData,
    handleToggleBusinessStatus,
    handleChangeBusinessPlan,
    updatingDemoId,
    handleSetBusinessDemo,
  };
};
