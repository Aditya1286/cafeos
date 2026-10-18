import { useEffect, useRef, useState } from 'react';
import { playOrderSound } from '../utils/orderSound';
import authService from '../services/auth';
import ordersService from '../services/dashboard/orders';
import { mergeOrders } from '../utils/kitchenOrders';
import menuService from '../services/dashboard/menu';
import tablesService from '../services/dashboard/tables';
import inventoryService from '../services/dashboard/inventory';
import businessService from '../services/dashboard/business';
import { readFileAsDataUrl } from '../utils/readFileAsDataUrl';
import analyticsService from '../services/dashboard/analytics';
import { toast } from '../utils/toast';
import { amendedOrderPatch } from '../utils/amendedItems';
import { getSocket, joinBusinessRoom, onReconnect } from '../services/socket';
import { DashboardAnalytics } from '../types';

interface UseOwnerDashboardDataOptions {
  /** Mirrors the same live order socket events into any other order list a caller keeps (e.g. the paginated order history table). */
  onOrderNew?: (order: any) => void;
  onOrderUpdated?: (patch: { orderId: string; orderStatus: string }) => void;
  onCustomerMarkedPaid?: (patch: { orderId: string; customerMarkedPaidAt: string }) => void;
  onRefundRequested?: (patch: { orderId: string; refundRequestedAt: string }) => void;
  /** Fired after a reconnect re-sync, so any other order list a caller keeps can re-fetch too. */
  onResync?: () => void;
  /**
   * Staff see the Kitchen, Orders and (view-only) Tables tabs: load just the business profile,
   * live orders and tables. Menu, inventory and analytics are owner/manager data — their
   * endpoints would refuse a staff login.
   */
  kitchenOnly?: boolean;
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
  // Latest orders for the reconnect re-sync below, which runs from a long-lived listener.
  const ordersRef = useRef<any[]>([]);
  ordersRef.current = orders;

  /** The orders the dashboard shows: the newest few (history strip, payments) plus EVERY order still
   * being worked on, so a long kitchen queue is never cut off at the newest 25. If the live list
   * can't be read the recent list still loads, rather than a blank board. */
  const fetchOrders = async (): Promise<any[]> => {
    const [recent, live] = await Promise.all([
      ordersService.list(),
      ordersService.listActive().catch((err) => {
        console.error('Failed to load the live kitchen orders:', err);
        return null;
      }),
    ]);
    if (live?.truncated) {
      toast.error('Too many open orders to show them all. Showing the oldest ones.');
    }
    return mergeOrders<any>(recent.data || [], live?.data || []);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const profileRes = await authService.getMe();
      setBusiness(profileRes.data.business);

      if (options.kitchenOnly) {
        const [liveOrders, tblRes] = await Promise.all([fetchOrders(), tablesService.list()]);
        setOrders(liveOrders);
        setTables(tblRes.data || []);
      } else {
        const [liveOrders, catRes, prodRes, tblRes, invRes, analRes] = await Promise.all([
          fetchOrders(),
          menuService.listCategories(),
          menuService.listProducts(),
          tablesService.list(),
          inventoryService.list(),
          analyticsService.getDashboard(),
        ]);

        setOrders(liveOrders);
        setCategories(catRes.data || []);
        setProducts(prodRes.data || []);
        setTables(tblRes.data || []);
        setInventoryItems(invRes.data || []);
        setAnalytics(analRes.data || null);
      }

      if (profileRes.data.business?._id) {
        joinBusinessRoom(profileRes.data.business._id);
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

    // A table's status (AVAILABLE/OCCUPIED) is only ever pushed as a side-effect of an
    // order event, never its own event — so both order:new (table gets occupied) and
    // order:updated (table gets freed once the order reaches a terminal state) patch
    // `tables` here. Without this, the Tables & QR tab only reflected reality after a
    // manual refresh, even though the DB and the customer-facing QR flow were already
    // correct in real time.
    const patchTableStatus = (
      tableId: string | null | undefined,
      tableStatus: string | null | undefined,
    ) => {
      if (!tableId || !tableStatus) return;
      setTables((prev) => prev.map((t) => (t._id === tableId ? { ...t, status: tableStatus } : t)));
    };

    const socket = getSocket();
    socket.on('order:new', (newOrder: any) => {
      setOrders((prev) => [newOrder, ...prev]);
      toast(`🔔 New order ${newOrder.orderNumber || newOrder.orderId} arrived!`);
      playOrderSound();
      const arrivedId = newOrder._id || newOrder.orderId;
      setNewlyArrivedOrderId(arrivedId);
      setTimeout(() => setNewlyArrivedOrderId((prev) => (prev === arrivedId ? null : prev)), 5000);
      patchTableStatus(newOrder.tableId, newOrder.tableStatus);
      callbacksRef.current.onOrderNew?.(newOrder);
    });
    socket.on('order:updated', (updated: any) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === updated.orderId || o.orderId === updated.orderId
            ? { ...o, orderStatus: updated.orderStatus, ...amendedOrderPatch(updated) }
            : o,
        ),
      );
      if (updated.amended) toast(`➕ Items added to ${updated.orderId}`);
      patchTableStatus(updated.tableId, updated.tableStatus);
      callbacksRef.current.onOrderUpdated?.(updated);
    });
    socket.on('order:customer_marked_paid', (updated: any) => {
      const patch = (o: any) =>
        o._id === updated.orderId || o.orderId === updated.orderId
          ? { ...o, customerMarkedPaidAt: updated.customerMarkedPaidAt }
          : o;
      setOrders((prev) => prev.map(patch));
      toast(`💳 ${updated.orderNumber || 'An order'} — customer says they've paid`);
      callbacksRef.current.onCustomerMarkedPaid?.(updated);
    });
    socket.on('order:refund_requested', (updated: any) => {
      const patch = (o: any) =>
        o._id === updated.orderId || o.orderId === updated.orderId
          ? { ...o, refundRequestedAt: updated.refundRequestedAt }
          : o;
      setOrders((prev) => prev.map(patch));
      toast(`💸 ${updated.orderNumber || 'A customer'} requested a refund`);
      callbacksRef.current.onRefundRequested?.(updated);
    });

    // Anything that happened while the socket was down (Wi-Fi drop, laptop asleep, deploy) never
    // arrives as an event, so re-read the live data once the business room is re-joined — and
    // ring for any new order that came in meanwhile, since the kitchen never heard it.
    const resyncAfterReconnect = async () => {
      try {
        const fresh: any[] = await fetchOrders();
        const known = new Set(ordersRef.current.map((o) => o._id));
        const missed = fresh.filter((o) => !known.has(o._id) && o.orderStatus === 'PLACED');
        setOrders(fresh);

        const [tblRes, analRes] = await Promise.all([
          tablesService.list(),
          callbacksRef.current.kitchenOnly ? null : analyticsService.getDashboard(),
        ]);
        setTables(tblRes.data || []);
        if (analRes) setAnalytics(analRes.data || null);

        if (missed.length > 0) {
          toast(
            `🔔 ${missed.length} new order${missed.length === 1 ? '' : 's'} arrived while you were offline`,
          );
          playOrderSound();
          const arrivedId = missed[0]._id;
          setNewlyArrivedOrderId(arrivedId);
          setTimeout(
            () => setNewlyArrivedOrderId((prev) => (prev === arrivedId ? null : prev)),
            5000,
          );
        }
        callbacksRef.current.onResync?.();
      } catch (err) {
        console.error('Failed to re-sync dashboard after reconnect:', err);
      }
    };
    const stopResync = onReconnect(resyncAfterReconnect);

    return () => {
      socket.off('order:new');
      socket.off('order:updated');
      socket.off('order:customer_marked_paid');
      socket.off('order:refund_requested');
      stopResync();
    };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!orderId) {
      toast.error('Missing order ID.');
      return;
    }
    try {
      const res = await ordersService.updateStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId || o.orderId === orderId
            ? {
                ...o,
                orderStatus: status,
                ...(status === 'REFUNDED' ? { paymentStatus: 'REFUNDED' } : {}),
              }
            : o,
        ),
      );
      toast.success(`Order status updated to ${status}`);
      return res.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  // Manually verifying a payment (cash at the counter, or an online payment the customer
  // claims) — independent of order status, unlike handleUpdateOrderStatus above which only
  // ever flips paymentStatus as a side effect of reaching SERVED/COMPLETED.
  const handleConfirmPayment = async (orderId: string) => {
    if (!orderId) {
      toast.error('Missing order ID.');
      return;
    }
    try {
      const res = await ordersService.confirmPayment(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId || o.orderId === orderId ? { ...o, paymentStatus: 'PAID' } : o,
        ),
      );
      toast.success(res.message || 'Payment confirmed');
    } catch (err: any) {
      toast.error(err.message || 'Could not confirm payment');
      throw err;
    }
  };

  // Bulk-move for the "select orders in a column, review, confirm" flow (New -> Preparing,
  // Preparing -> Ready, Ready -> Completed). Keeps going past individual order failures on the backend, so this reports
  // back exactly which orders updated and which didn't rather than an all-or-nothing result.
  const handleBulkUpdateOrderStatus = async (
    orderIds: string[],
    status: string,
  ): Promise<{ updatedIds: string[]; failed: { orderId: string; message: string }[] }> => {
    const res = await ordersService.bulkUpdateStatus(orderIds, status);
    const updated: any[] = res.data?.updated || [];
    const failed: { orderId: string; message: string }[] = res.data?.failed || [];

    const updatedIds = updated.map((o) => o._id || o.orderId);
    setOrders((prev) =>
      prev.map((o) => {
        const match = updated.find((u) => u._id === o._id || u.orderId === o.orderId);
        return match
          ? { ...o, orderStatus: match.orderStatus, paymentStatus: match.paymentStatus }
          : o;
      }),
    );

    if (updated.length > 0)
      toast.success(`${updated.length} order${updated.length === 1 ? '' : 's'} updated`);
    if (failed.length > 0)
      toast.error(`${failed.length} order${failed.length === 1 ? '' : 's'} could not be updated`);

    return { updatedIds, failed };
  };

  // The business's own logo in the top bar: a picked image replaces it, removing goes back to the default tile.
  const [savingLogo, setSavingLogo] = useState(false);
  const changeLogo = async (
    change: () => Promise<{ data: { logoUrl: string } }>,
    success: string,
  ) => {
    setSavingLogo(true);
    try {
      const { data } = await change();
      setBusiness((prev: any) => (prev ? { ...prev, logoUrl: data.logoUrl } : prev));
      toast.success(success);
    } catch (err: any) {
      toast.error(err.message || 'Could not change the logo');
    } finally {
      setSavingLogo(false);
    }
  };
  const handleUploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image (JPEG, PNG or WEBP).');
      return;
    }
    await changeLogo(
      async () => businessService.uploadLogo(await readFileAsDataUrl(file)),
      'Logo updated',
    );
  };
  const handleRemoveLogo = () => changeLogo(() => businessService.removeLogo(), 'Logo removed');

  const [savingUpiVpa, setSavingUpiVpa] = useState(false);
  const handleSaveUpiVpa = async (upiVpa: string) => {
    setSavingUpiVpa(true);
    try {
      await businessService.updateSettings({ upiVpa });
      setBusiness((prev: any) => (prev ? { ...prev, upiVpa } : prev));
      toast.success('UPI ID saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not save UPI ID');
    } finally {
      setSavingUpiVpa(false);
    }
  };

  const [savingGstin, setSavingGstin] = useState(false);
  const handleSaveGstin = async (gstin: string): Promise<boolean> => {
    setSavingGstin(true);
    try {
      await businessService.updateSettings({ gstin });
      setBusiness((prev: any) => (prev ? { ...prev, gstin: gstin || undefined } : prev));
      toast.success(gstin ? 'GSTIN saved' : 'GSTIN removed');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not save GSTIN');
      return false;
    } finally {
      setSavingGstin(false);
    }
  };

  const [savingTaxRate, setSavingTaxRate] = useState(false);
  const handleSaveTaxRate = async (taxRatePercentage: number) => {
    setSavingTaxRate(true);
    try {
      await businessService.updateSettings({ taxRatePercentage });
      setBusiness((prev: any) => (prev ? { ...prev, taxRatePercentage } : prev));
      toast.success(
        taxRatePercentage > 0
          ? `GST enabled at ${taxRatePercentage}%`
          : "GST disabled — new orders won't be taxed",
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not update GST setting');
    } finally {
      setSavingTaxRate(false);
    }
  };

  const [savingTablesEnabled, setSavingTablesEnabled] = useState(false);
  const handleToggleTablesEnabled = async () => {
    const next = !(business?.tablesEnabled ?? true);
    setSavingTablesEnabled(true);
    try {
      await businessService.updateSettings({ tablesEnabled: next });
      setBusiness((prev: any) => (prev ? { ...prev, tablesEnabled: next } : prev));
      toast.success(next ? 'Tables enabled' : 'Tables disabled — orders no longer need a table');
    } catch (err: any) {
      toast.error(err.message || 'Could not update tables setting');
    } finally {
      setSavingTablesEnabled(false);
    }
  };

  // The master QR (general menu link): whether it still takes counter orders while tables are on.
  // A business saved before the setting existed counts as on, matching the backend default.
  const [savingMasterQr, setSavingMasterQr] = useState(false);
  const handleToggleMasterQr = async () => {
    const next = business?.masterQrEnabled === false;
    setSavingMasterQr(true);
    try {
      await businessService.updateSettings({ masterQrEnabled: next });
      setBusiness((prev: any) => (prev ? { ...prev, masterQrEnabled: next } : prev));
      toast.success(next ? 'Master QR now takes orders' : 'Master QR switched to menu-only');
    } catch (err: any) {
      toast.error(err.message || 'Could not update the master QR');
    } finally {
      setSavingMasterQr(false);
    }
  };

  // Disables/re-enables one table's QR without deleting it (table row + its order history stay).
  const handleToggleTableActive = async (tableId: string) => {
    try {
      const res = await tablesService.toggleActive(tableId);
      setTables((prev) =>
        prev.map((t) => (t._id === tableId ? { ...t, isActive: res.data.isActive } : t)),
      );
      toast.success(res.message || 'Table updated');
    } catch (err: any) {
      toast.error(err.message || 'Could not update table');
    }
  };

  // Manual override for a stuck "Occupied" indicator — force-clears the table's status
  // without touching whatever order (if any) still points at it.
  const handleMarkTableEmpty = async (tableId: string) => {
    try {
      const res = await tablesService.markEmpty(tableId);
      setTables((prev) =>
        prev.map((t) => (t._id === tableId ? { ...t, status: res.data.status } : t)),
      );
      toast.success(res.message || 'Table marked as empty');
    } catch (err: any) {
      toast.error(err.message || 'Could not update table');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    try {
      await tablesService.remove(tableId);
      setTables((prev) => prev.filter((t) => t._id !== tableId));
      toast.success('Table deleted');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete table');
    }
  };

  // "Remove" never deletes the product row (see menuController.deleteProduct) — it just
  // flips isAvailable off, so the item vanishes from the public menu and can't be ordered,
  // but stays in this list for the owner to restore later.
  const handleRemoveProduct = async (productId: string) => {
    try {
      await menuService.removeProduct(productId);
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, isAvailable: false } : p)),
      );
      toast.success('Item removed from menu');
    } catch (err: any) {
      toast.error(err.message || 'Could not remove item');
    }
  };

  const handleRestoreProduct = async (productId: string) => {
    try {
      await menuService.restoreProduct(productId);
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, isAvailable: true } : p)),
      );
      toast.success('Item restored to menu');
    } catch (err: any) {
      toast.error(err.message || 'Could not restore item');
    }
  };

  // House special (café identity): at most 3 dishes per café. The API refuses a fourth with a
  // message fit to show, which is surfaced as is; nothing changes locally unless it succeeds.
  const handleToggleHouseSpecial = async (productId: string, on: boolean) => {
    try {
      await menuService.setHouseSpecial(productId, on);
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, isHouseSpecial: on } : p)),
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not update the house special.');
    }
  };

  // Distinct from handleRemoveProduct — this one drops the item from `products` entirely
  // (see menuController.archiveProduct: sets isDeleted, which the backend list query now
  // excludes), so it's really gone from this dashboard, not just flagged unavailable. The
  // document itself is still kept server-side.
  const handleDeleteProduct = async (productId: string) => {
    try {
      await menuService.archiveProduct(productId);
      setProducts((prev) => prev.filter((p) => p._id !== productId));
      toast.success('Item deleted');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete item');
    }
  };

  return {
    orders,
    setOrders,
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
    handleBulkUpdateOrderStatus,
    handleConfirmPayment,
    savingLogo,
    handleUploadLogo,
    handleRemoveLogo,
    savingUpiVpa,
    handleSaveUpiVpa,
    savingGstin,
    handleSaveGstin,
    savingTaxRate,
    handleSaveTaxRate,
    savingTablesEnabled,
    handleToggleTablesEnabled,
    savingMasterQr,
    handleToggleMasterQr,
    handleToggleTableActive,
    handleDeleteTable,
    handleMarkTableEmpty,
    handleRemoveProduct,
    handleRestoreProduct,
    handleToggleHouseSpecial,
    handleDeleteProduct,
  };
};
