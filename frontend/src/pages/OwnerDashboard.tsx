import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed, QrCode, Settings, Plus, RefreshCw, X, Coffee, Package,
  Users, DollarSign, ShoppingBag, AlertTriangle, CheckCircle2,
  Clock, Zap, BarChart3, Flame, LogOut, Globe, Wifi, Sparkles, ChefHat, ArrowUpRight, TrendingUp, Info,
  Printer, ExternalLink, Copy, Check, ShieldCheck, Sliders, Layers, Store, CreditCard,
  FileText, Search, Filter, Calendar, Download, Share2, ArrowRight, ChevronRight, Smartphone, User, Hash, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar
} from 'recharts';
import { apiRequest } from '../services/api';
import { getSocket } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; borderAccent: string; badgeBg: string; badgeText: string; dot: string }> = {
  PLACED:    { label: 'New Order',  color: 'text-purple-700', borderAccent: 'border-t-purple-500', badgeBg: 'bg-purple-50',  badgeText: 'text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700',   borderAccent: 'border-t-blue-500',   badgeBg: 'bg-blue-50',    badgeText: 'text-blue-700 border-blue-200',   dot: 'bg-blue-500'   },
  PREPARING: { label: 'Cooking',   color: 'text-amber-700',  borderAccent: 'border-t-amber-500',  badgeBg: 'bg-amber-50',   badgeText: 'text-amber-700 border-amber-200',  dot: 'bg-amber-500'  },
  READY:     { label: 'Ready to Serve', color: 'text-emerald-700', borderAccent: 'border-t-emerald-500', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700 border-emerald-200', dot: 'bg-emerald-500'},
  COMPLETED: { label: 'Completed', color: 'text-slate-500',  borderAccent: 'border-t-slate-400', badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600 border-slate-200',  dot: 'bg-slate-400'  },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700',   borderAccent: 'border-t-rose-500',   badgeBg: 'bg-rose-50',    badgeText: 'text-rose-700 border-rose-200',   dot: 'bg-rose-500'   },
};

const NEXT_STATUS: Record<string, { label: string; status: string; color: string }> = {
  PLACED:    { label: 'Accept Order', status: 'CONFIRMED', color: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20' },
  CONFIRMED: { label: 'Start Cooking 👨‍🍳', status: 'PREPARING', color: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20' },
  PREPARING: { label: 'Mark Ready 🔔', status: 'READY',     color: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20' },
  READY:     { label: 'Complete Order 🎉', status: 'COMPLETED', color: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20' },
};

// ─── Modal Component ─────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, maxWidth = 'max-w-md' }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full ${maxWidth} p-6 space-y-5 my-8`}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-700">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-slate-400";

export const OwnerDashboard = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState<'kds' | 'orders' | 'menu' | 'tables' | 'inventory' | 'analytics' | 'settings'>('kds');
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // ─── Order History & Search State ──────────────────────────────────────────
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Drawer & Bill Modal states
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<any | null>(null);

  // Modal states for creation
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);

  // Form states
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductPricePaise, setNewProductPricePaise] = useState(24900);
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductIsVeg, setNewProductIsVeg] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newInvName, setNewInvName] = useState('');
  const [newInvUnit, setNewInvUnit] = useState('KG');
  const [newInvStock, setNewInvStock] = useState(10);
  const [newInvMinStock, setNewInvMinStock] = useState(3);
  const [newInvCostPaise, setNewInvCostPaise] = useState(40000);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Keyboard shortcut Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('orders');
        setTimeout(() => {
          document.getElementById('order-search-input')?.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(orderSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [orderSearchQuery]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const profileRes = await apiRequest('/auth/me');
      setRestaurant(profileRes.data.restaurant);

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

      if (profileRes.data.restaurant?._id) {
        const socket = getSocket();
        socket.emit('join_tenant_room', profileRes.data.restaurant._id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      setLoadingHistory(true);
      let url = `/orders?page=${pagination.page}&limit=${pagination.limit}`;
      if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
      if (selectedStatusFilter !== 'ALL') url += `&status=${selectedStatusFilter}`;
      if (selectedPaymentFilter !== 'ALL') url += `&paymentStatus=${selectedPaymentFilter}`;
      if (selectedMethodFilter !== 'ALL') url += `&paymentMethod=${selectedMethodFilter}`;

      if (selectedDateFilter === 'TODAY') {
        const todayStr = new Date().toISOString().split('T')[0];
        url += `&startDate=${todayStr}T00:00:00.000Z`;
      } else if (selectedDateFilter === 'YESTERDAY') {
        const yest = new Date(Date.now() - 86400000);
        const yestStr = yest.toISOString().split('T')[0];
        url += `&startDate=${yestStr}T00:00:00.000Z&endDate=${yestStr}T23:59:59.999Z`;
      } else if (selectedDateFilter === '7DAYS') {
        const d = new Date(Date.now() - 7 * 86400000);
        url += `&startDate=${d.toISOString()}`;
      }

      const res = await apiRequest(url);
      if (res.success) {
        setOrderHistory(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();
    socket.on('order:new', (newOrder: any) => {
      setOrders(prev => [newOrder, ...prev]);
      setOrderHistory(prev => [newOrder, ...prev]);
      showToast(`🔔 New order ${newOrder.orderNumber || newOrder.orderId} arrived!`);
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch {}
    });
    socket.on('order:updated', (updated: any) => {
      setOrders(prev => prev.map(o => ((o._id === updated.orderId || o.orderId === updated.orderId) ? { ...o, orderStatus: updated.orderStatus } : o)));
      setOrderHistory(prev => prev.map(o => ((o._id === updated.orderId || o.orderId === updated.orderId) ? { ...o, orderStatus: updated.orderStatus } : o)));
    });

    return () => { socket.off('order:new'); socket.off('order:updated'); };
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrderHistory();
    }
  }, [activeTab, debouncedQuery, selectedStatusFilter, selectedPaymentFilter, selectedMethodFilter, selectedDateFilter, pagination.page]);

  const handleOpenOrderDrawer = async (order: any) => {
    setSelectedOrderForDrawer(order);
    setLoadingOrderDetails(true);
    try {
      const res = await apiRequest(`/orders/${order.orderId || order._id}`);
      if (res.success) {
        setSelectedOrderDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleOpenEBillModal = async (orderId: string) => {
    try {
      const res = await apiRequest(`/orders/${orderId}/bill`);
      if (res.success) {
        setSelectedOrderForBill(res.data);
      }
    } catch (err) {
      console.error('Failed to load bill data:', err);
      showToast('Could not load bill details.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!orderId) {
      alert('Error: Missing order ID.');
      return;
    }
    try {
      await apiRequest(`/orders/${orderId}/status`, 'PUT', { status });
      setOrders(prev => prev.map(o => ((o._id === orderId || o.orderId === orderId) ? { ...o, orderStatus: status } : o)));
      setOrderHistory(prev => prev.map(o => ((o._id === orderId || o.orderId === orderId) ? { ...o, orderStatus: status } : o)));
      if (selectedOrderForDrawer && (selectedOrderForDrawer._id === orderId || selectedOrderForDrawer.orderId === orderId)) {
        setSelectedOrderForDrawer((prev: any) => ({ ...prev, orderStatus: status }));
      }
      showToast(`Order status updated to ${status}`);
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/menu/products', 'POST', {
        name: newProductName,
        categoryId: newProductCategoryId || categories[0]?._id,
        pricePaise: Number(newProductPricePaise),
        description: newProductDescription,
        isVeg: newProductIsVeg,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'
      });
      setShowAddProductModal(false);
      setNewProductName(''); setNewProductDescription('');
      fetchDashboardData();
      showToast('✅ Product added to menu!');
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/tables', 'POST', { tableNumber: newTableNumber, capacity: Number(newTableCapacity) });
      setShowAddTableModal(false);
      setNewTableNumber('');
      fetchDashboardData();
      showToast('✅ Table & QR code created!');
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/inventory/items', 'POST', {
        name: newInvName, unit: newInvUnit,
        currentStock: Number(newInvStock),
        minimumStockLevel: Number(newInvMinStock),
        costPerUnitPaise: Number(newInvCostPaise)
      });
      setShowAddInventoryModal(false);
      setNewInvName('');
      fetchDashboardData();
      showToast('✅ Ingredient added to inventory!');
    } catch (err: any) { alert(err.message); }
  };

  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.orderStatus));
  const lowStockCount = inventoryItems.filter(i => i.status !== 'IN_STOCK').length;
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;

  const publicMenuUrl = `${window.location.origin}/c/${restaurant?.slug || 'artisan-cafe'}`;

  const copyMenuUrl = () => {
    navigator.clipboard.writeText(publicMenuUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    showToast('📋 Public QR menu URL copied to clipboard!');
  };

  const chartData = analytics?.dailySales?.map((d: any) => ({
    day: d._id?.split('-').slice(1).join('/') || d._id,
    sales: Math.round(d.salesPaise / 100),
    orders: d.orders
  })) || [
    { day: 'Mon', sales: 4800, orders: 12 }, { day: 'Tue', sales: 6200, orders: 18 },
    { day: 'Wed', sales: 5100, orders: 15 }, { day: 'Thu', sales: 7800, orders: 22 },
    { day: 'Fri', sales: 9400, orders: 28 }, { day: 'Sat', sales: 11200, orders: 35 },
    { day: 'Sun', sales: 8600, orders: 26 }
  ];

  const tabs = [
    { id: 'kds',       label: 'Kitchen KDS', icon: Flame,         badge: activeOrders.length || null },
    { id: 'orders',    label: 'Orders & History', icon: FileText, badge: null },
    { id: 'menu',      label: 'Digital Menu',icon: UtensilsCrossed,badge: null },
    { id: 'tables',    label: 'Tables & QR', icon: QrCode,        badge: null },
    { id: 'inventory', label: 'Inventory',   icon: Package,       badge: lowStockCount || null },
    { id: 'analytics', label: 'Analytics',   icon: BarChart3,     badge: null },
    { id: 'settings',  label: 'Settings Hub',icon: Settings,      badge: null },
  ] as const;

  const tooltipStyle = {
    backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a',
    borderRadius: '12px', fontSize: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-orange-500 selection:text-white pb-12">

      {/* ── Notification Toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-[60] px-4 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-2xl flex items-center gap-3 border border-slate-800"
          >
            <Zap className="w-4 h-4 text-orange-400 animate-bounce" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Premium Dark Slate Header Bar (Stripe & Linear SaaS Style) ─────── */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Bar Row */}
          <div className="h-16 flex items-center justify-between gap-4 border-b border-slate-800/80">
            {/* Café Brand Logo & Link */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white font-black">
                <Coffee className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="text-base font-black text-white leading-tight flex items-center gap-2">
                  <span>{restaurant?.name || 'The Artisan Roastery & Café'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    PRO CAFÉ
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="truncate max-w-[200px] sm:max-w-[300px]">
                    /c/{restaurant?.slug || 'artisan-cafe'}
                  </span>
                  <button
                    onClick={copyMenuUrl}
                    className="hover:text-orange-400 transition-colors flex items-center gap-1 text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy Menu URL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live KDS Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live KDS · {activeOrders.length} active orders</span>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddProductModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>

              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => { localStorage.removeItem('cafeos_token'); window.location.href = '/login'; }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800 text-xs font-bold text-slate-300"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <LogOut className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>
            </div>
          </div>

          {/* Navigation Bar (Segmented Dark Glass Tabs) */}
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap relative ${
                    active
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? 'bg-white/30 text-white' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Content Body ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        
        {/* ── High-Density KPI Stat Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {[
            { 
              icon: Flame,
              label: 'Active KDS Orders',
              value: activeOrders.length,
              subtext: 'Orders in kitchen queue',
              trend: 'Live Queue',
              color: 'text-purple-600',
              iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
              border: 'border-purple-200/80',
              progress: activeOrders.length > 0 ? 75 : 10
            },
            { 
              icon: DollarSign,
              label: 'Today Total Sales',
              value: `₹${(((analytics?.metrics?.totalSalesPaise) || 61940) / 100).toLocaleString('en-IN')}`,
              subtext: 'Net gross revenue',
              trend: '+18.4% this week',
              color: 'text-emerald-600',
              iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
              border: 'border-emerald-200/80',
              progress: 88
            },
            { 
              icon: Users,
              label: 'Table Floor Occupancy',
              value: `${occupiedTables} / ${tables.length}`,
              subtext: `${tables.length ? Math.round((occupiedTables/tables.length)*100) : 0}% seating occupied`,
              trend: `${occupiedTables} active tables`,
              color: 'text-blue-600',
              iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
              border: 'border-blue-200/80',
              progress: tables.length ? Math.round((occupiedTables/tables.length)*100) : 0
            },
            { 
              icon: AlertTriangle,
              label: 'Low Stock Alerts',
              value: lowStockCount,
              subtext: lowStockCount > 0 ? 'Ingredients restock needed' : 'All stock levels healthy',
              trend: lowStockCount > 0 ? 'Restock Soon' : 'Healthy',
              color: lowStockCount > 0 ? 'text-rose-600' : 'text-slate-600',
              iconBg: lowStockCount > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-slate-600 to-slate-700',
              border: lowStockCount > 0 ? 'border-rose-200/80' : 'border-slate-200/80',
              progress: lowStockCount > 0 ? 100 : 0
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -2 }}
              className={`bg-white p-5 rounded-3xl border ${card.border} shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    {card.label}
                  </span>
                  <div className={`text-2xl sm:text-3xl font-black ${card.color} tracking-tight`}>
                    {card.value}
                  </div>
                </div>

                <div className={`w-11 h-11 rounded-2xl ${card.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}>
                  <card.icon className="w-5.5 h-5.5" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="truncate">{card.subtext}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold shrink-0">
                  {card.trend}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── TAB 1: Kitchen KDS (Live Kanban) ─────────────────────────────── */}
        {activeTab === 'kds' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-200 flex items-center justify-center">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">Live Kitchen Display System (KDS)</h2>
                  <p className="text-xs text-slate-500 font-medium">Real-time order progression for kitchen staff</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('orders')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>View All Orders →</span>
                </button>

                <div className="px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black flex items-center gap-1.5 hidden sm:flex">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                  <span>WebSocket Active</span>
                </div>
              </div>
            </div>

            {/* Kanban Columns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {(['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] as const).map(colStatus => {
                const sc = STATUS_CONFIG[colStatus];
                const columnOrders = orders.filter(o => o.orderStatus === colStatus);

                return (
                  <div
                    key={colStatus}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[520px] overflow-hidden"
                  >
                    {/* Column Header */}
                    <div className={`px-4 py-3.5 ${sc.badgeBg} border-b ${sc.borderAccent} border-t-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                        <span className={`text-xs font-black ${sc.color} uppercase tracking-wider`}>
                          {sc.label}
                        </span>
                      </div>
                      <span className={`w-6 h-6 rounded-full bg-white border ${sc.badgeText} text-xs font-black flex items-center justify-center shadow-xs`}>
                        {columnOrders.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto bg-slate-50/50">
                      <AnimatePresence>
                        {columnOrders.map(order => {
                          const targetOrderId = order._id || order.orderId;
                          return (
                            <motion.div
                              key={targetOrderId || order.orderNumber}
                              layout
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all p-4 space-y-3"
                            >
                              {/* Order Card Header */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                                  {order.orderId || order.orderNumber}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black">
                                  {order.tableName || 'Table 01'}
                                </span>
                              </div>

                              {/* Customer info */}
                              <div>
                                <div className="text-xs font-black text-slate-900">{order.customerName}</div>
                                <div className="text-[10px] font-semibold text-slate-400">{order.customerPhone}</div>
                              </div>

                              {/* Items list */}
                              <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs">
                                {order.items?.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-slate-700 font-medium">
                                    <span>
                                      <strong className="text-slate-900 font-extrabold">{it.quantity}×</strong> {it.name}
                                    </span>
                                    <span className="font-extrabold text-slate-900">
                                      ₹{Math.round((it.itemTotalPaise || (it.pricePaise * it.quantity) || 0) / 100)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Total Amount & Action CTA Button */}
                              <div className="flex items-center justify-between pt-1">
                                <div className="text-xs font-black text-emerald-600">
                                  ₹{Math.round((order.totalAmountPaise || 0) / 100)}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenEBillModal(order.orderId || order._id)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                    title="View E-Bill"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>

                                  {NEXT_STATUS[colStatus] && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(targetOrderId, NEXT_STATUS[colStatus].status)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all transform active:scale-95 flex items-center gap-1 ${NEXT_STATUS[colStatus].color}`}
                                    >
                                      <span>{NEXT_STATUS[colStatus].label}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {columnOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                          <div className={`w-12 h-12 rounded-2xl ${sc.badgeBg} border ${sc.badgeText} flex items-center justify-center shadow-xs`}>
                            <CheckCircle2 className={`w-6 h-6 ${sc.color} opacity-60`} />
                          </div>
                          <div className="text-xs font-black text-slate-400">No {sc.label.toLowerCase()} orders</div>
                          <div className="text-[10px] text-slate-400 font-medium">Kitchen is all caught up</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Recent Orders Widget ── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Recent Completed Orders</h3>
                    <p className="text-[11px] font-medium text-slate-500">Latest completed or served transactions</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
                >
                  <span>View All Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {orders.slice(0, 4).map(o => (
                  <div key={o._id || o.orderId} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-black text-slate-900">
                        {o.orderId || o.orderNumber}
                      </span>
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                          <span>{o.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({o.tableName || 'Takeaway'})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                          {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-600">₹{Math.round((o.totalAmountPaise || 0) / 100)}</div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{o.paymentMethod || 'UPI'} · {o.paymentStatus || 'PAID'}</span>
                      </div>

                      <button
                        onClick={() => handleOpenEBillModal(o.orderId || o._id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Bill</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ORDER HISTORY + ORDER SEARCH + E-BILL SYSTEM ─────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">Order Intelligence & History</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-black">
                    E-BILL READY
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Search, review, inspect bills, and audit every café transaction by unique daily order sequence.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono font-bold hidden md:inline-block">
                  Shortcut: <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 shadow-2xs text-slate-700 font-black">⌘K</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 shadow-2xs text-slate-700 font-black">Ctrl+K</kbd>
                </span>

                <button
                  onClick={fetchOrderHistory}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-orange-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Orders</span>
                <div className="text-2xl font-black text-slate-900">{pagination.total || orderHistory.length}</div>
                <span className="text-[10px] font-semibold text-slate-400">Total recorded transactions</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Today's Revenue</span>
                <div className="text-2xl font-black text-emerald-600">
                  ₹{Math.round((orderHistory.reduce((acc, o) => acc + (o.totalAmountPaise || 0), 0)) / 100).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] font-semibold text-emerald-600">Active page total</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Daily Sequence Prefix</span>
                <div className="text-2xl font-black text-orange-600 font-mono">
                  {restaurant?.shortCode || 'ART'}-DDMMYY
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Auto-resets every midnight</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Timezone Scope</span>
                <div className="text-2xl font-black text-indigo-600 truncate">
                  {restaurant?.timezone || 'Asia/Kolkata'}
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Concurrency-safe MongoDB sequence</span>
              </div>
            </div>

            {/* Instant Search Bar & Filter Controls */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              
              {/* Search Bar Input */}
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="order-search-input"
                  type="text"
                  placeholder="Search by Order ID (e.g. ART-120926-0001), Customer Name, Phone, Table 04, or Transaction ID..."
                  value={orderSearchQuery}
                  onChange={e => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Order Status</label>
                  <select
                    value={selectedStatusFilter}
                    onChange={e => setSelectedStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PLACED">Placed</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PREPARING">Preparing</option>
                    <option value="READY">Ready</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Payment Status</label>
                  <select
                    value={selectedPaymentFilter}
                    onChange={e => setSelectedPaymentFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="PAID">Paid</option>
                    <option value="UNPAID">Unpaid / Pending</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Payment Method</label>
                  <select
                    value={selectedMethodFilter}
                    onChange={e => setSelectedMethodFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  >
                    <option value="ALL">All Payment Methods</option>
                    <option value="ONLINE">UPI / Online</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Date Filter</label>
                  <select
                    value={selectedDateFilter}
                    onChange={e => setSelectedDateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  >
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today</option>
                    <option value="YESTERDAY">Yesterday</option>
                    <option value="7DAYS">Last 7 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders Table Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              
              {loadingHistory ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Searching orders database...</p>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-black text-slate-800">No matching orders found</h3>
                  <p className="text-xs font-medium text-slate-500">Try adjusting your search query or filter options.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-5 py-4">Order ID & Date</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Table</th>
                        <th className="px-5 py-4">Items Ordered</th>
                        <th className="px-5 py-4">Amount</th>
                        <th className="px-5 py-4">Payment</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {orderHistory.map(o => {
                        const sc = STATUS_CONFIG[o.orderStatus] || STATUS_CONFIG.COMPLETED;
                        const dateFormatted = new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        });
                        const timeFormatted = new Date(o.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        });

                        return (
                          <tr key={o._id || o.orderId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl inline-block mb-1">
                                {o.orderId || o.orderNumber}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                {dateFormatted} · {timeFormatted}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-black text-slate-900">{o.customerName}</div>
                              <div className="text-[11px] text-slate-400 font-semibold">{o.customerPhone}</div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-extrabold">
                                {o.tableName || 'Takeaway'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="text-slate-900 font-bold max-w-xs truncate">
                                {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">{o.items?.length || 0} items</span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-black text-slate-900 text-sm">
                                ₹{Math.round((o.totalAmountPaise || 0) / 100)}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {o.paymentStatus || 'PAID'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {o.paymentMethod || 'UPI'}
                                </span>
                              </div>
                              {o.transactionId && (
                                <div className="text-[9px] font-mono text-slate-400 truncate max-w-[100px]" title={o.transactionId}>
                                  {o.transactionId}
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${sc.badgeBg} ${sc.badgeText}`}>
                                ● {sc.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenOrderDrawer(o)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors shadow-xs"
                                >
                                  Details
                                </button>

                                <button
                                  onClick={() => handleOpenEBillModal(o.orderId || o._id)}
                                  className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black transition-colors flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>E-Bill</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      Previous
                    </button>
                    <button
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: Digital Menu ─────────────────────────────────────────── */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Digital Menu</h2>
                <p className="text-xs text-slate-500 font-medium">Manage dishes, categories, and customer prices</p>
              </div>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Menu Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map(p => (
                <motion.div
                  key={p._id}
                  whileHover={{ y: -3 }}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  <div className="relative h-40 bg-slate-100">
                    <img src={p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'} alt={p.name} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        p.isVeg ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {p.isVeg ? '● VEG' : '● NON-VEG'}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 rounded-full bg-white/95 border border-slate-200 text-xs font-black text-slate-900 shadow-xs">
                        ₹{Math.round(p.pricePaise / 100)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 mb-1">{p.name}</h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2">{p.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>{p.preparationTimeMinutes || 15}m prep time</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-black text-[10px]">Active</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: Tables & QR ──────────────────────────────────────────── */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Dining Tables & QR Codes</h2>
                <p className="text-xs text-slate-500 font-medium">Customer scans QR to open instant table ordering webpage</p>
              </div>
              <button
                onClick={() => setShowAddTableModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Table
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {tables.map(t => {
                const qrUrl = `${window.location.origin}/c/${restaurant?.slug}/t/${t.qrToken}`;
                const isOccupied = t.status === 'OCCUPIED';

                return (
                  <div key={t._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 text-center space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">{t.tableNumber}</span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        isOccupied ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isOccupied ? 'Occupied' : 'Free'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center my-2">
                      <QRCodeSVG value={qrUrl} size={115} />
                    </div>

                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-all shadow-xs"
                    >
                      Test QR Scan Page →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 5: Inventory ────────────────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Inventory Stock & Automatic BOM</h2>
                <p className="text-xs text-slate-500 font-medium">Ingredients automatically deduct when kitchen accepts orders</p>
              </div>
              <button
                onClick={() => setShowAddInventoryModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Ingredient
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Ingredient Name</th>
                    <th className="px-5 py-3.5">Stock</th>
                    <th className="px-5 py-3.5">Unit</th>
                    <th className="px-5 py-3.5">Min Stock Level</th>
                    <th className="px-5 py-3.5">Cost/Unit</th>
                    <th className="px-5 py-3.5">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {inventoryItems.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-black text-slate-900">{item.name}</td>
                      <td className="px-5 py-4 text-slate-900 font-bold">{item.currentStock}</td>
                      <td className="px-5 py-4 text-slate-500">{item.unit}</td>
                      <td className="px-5 py-4 text-slate-500">{item.minimumStockLevel}</td>
                      <td className="px-5 py-4">₹{(item.costPerUnitPaise / 100).toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          item.status === 'IN_STOCK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.status === 'IN_STOCK' ? 'In Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 6: Analytics ────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Financial & Sales Analytics</h2>
              <p className="text-xs text-slate-500 font-medium">Daily order volume and gross revenue metrics</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900">Daily Gross Revenue (₹)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`₹${v}`, 'Revenue']} />
                    <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 7: Settings Hub ─────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Profile & Cafe Configuration */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Cafe Profile Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md">
                      {restaurant?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{restaurant?.name || 'The Artisan Roastery'}</h2>
                      <div className="text-xs text-slate-400 font-semibold flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                          ACTIVE CAFÉ
                        </span>
                        <span>Slug: /c/{restaurant?.slug}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={copyMenuUrl}
                    className="px-3.5 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 text-xs font-black transition-all flex items-center gap-1.5"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy Menu URL'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Address Location</span>
                    <div className="text-xs font-extrabold text-slate-800">{restaurant?.address || 'Bandra West, Mumbai'}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Contact Phone</span>
                    <div className="text-xs font-extrabold text-slate-800">{restaurant?.phone || '+91 9876501234'}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Operating Hours</span>
                    <div className="text-xs font-extrabold text-slate-800">{restaurant?.openingTime || '08:00'} – {restaurant?.closingTime || '23:00'}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">GST Tax & Currency</span>
                    <div className="text-xs font-extrabold text-slate-800">{restaurant?.taxRatePercentage || 5}% GST · {restaurant?.currency || 'INR'} (₹)</div>
                  </div>
                </div>
              </div>

              {/* SaaS Subscription Plan Details Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-black text-slate-900">CaféOS Subscription Plan</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-orange-500 text-white font-extrabold text-xs shadow-sm">
                    PREMIUM GROWTH PLAN
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Dining Tables</span>
                    <div className="text-lg font-black text-slate-900">{tables.length} / 50</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Menu Items</span>
                    <div className="text-lg font-black text-slate-900">{products.length} / 200</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Per Order Platform Fee</span>
                    <div className="text-lg font-black text-orange-600">₹2.00</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Column: QR Code Quick Preview & Download */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-200 flex items-center justify-center mx-auto">
                  <QrCode className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900">Public Contactless QR</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Scan to open digital menu & place orders</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block my-2 shadow-inner">
                  <QRCodeSVG value={publicMenuUrl} size={150} />
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={publicMenuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs text-center transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Test Customer View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={copyMenuUrl}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Menu Link</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── ORDER DETAILS RIGHT SLIDE-OVER DRAWER ─────────────────────────── */}
      <AnimatePresence>
        {selectedOrderForDrawer && (
          <div
            className="fixed inset-0 z-50 overflow-hidden"
            style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedOrderForDrawer(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 right-0 max-w-full flex pl-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between">
                
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Order Details</span>
                    <div className="text-lg font-black text-orange-600 font-mono flex items-center gap-2">
                      <span>{selectedOrderForDrawer.orderId || selectedOrderForDrawer.orderNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        STATUS_CONFIG[selectedOrderForDrawer.orderStatus]?.badgeBg || 'bg-slate-100'
                      } ${STATUS_CONFIG[selectedOrderForDrawer.orderStatus]?.badgeText || 'text-slate-700'}`}>
                        {selectedOrderForDrawer.orderStatus}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrderForDrawer(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body Scroll */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  
                  {/* Customer Details Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Customer Profile</span>
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-sm font-black text-slate-900">{selectedOrderForDrawer.customerName}</div>
                    <div className="text-xs font-semibold text-slate-500">{selectedOrderForDrawer.customerPhone}</div>

                    {selectedOrderDetails?.customerStats && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>{selectedOrderDetails.customerStats.previousOrdersCount || 1} previous orders</span>
                        <span className="text-emerald-600 font-black">
                          ₹{Math.round((selectedOrderDetails.customerStats.lifetimeSpendPaise || 0) / 100)} lifetime spend
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Table & Source Card */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Table Number</span>
                      <div className="text-xs font-black text-slate-800">{selectedOrderForDrawer.tableName || 'Takeaway'}</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Order Source</span>
                      <div className="text-xs font-black text-slate-800">{selectedOrderForDrawer.source || 'QR_TABLE'}</div>
                    </div>
                  </div>

                  {/* Order Items Breakdown */}
                  <div className="space-y-3">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wider">Ordered Items</div>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {selectedOrderForDrawer.items?.map((it: any, i: number) => (
                        <div key={i} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-extrabold text-slate-900">
                              <span className="text-orange-600">{it.quantity}×</span> {it.name}
                            </div>
                            {it.variantName && (
                              <div className="text-[10px] font-medium text-slate-400">Variant: {it.variantName}</div>
                            )}
                            {it.addons && it.addons.length > 0 && (
                              <div className="text-[10px] font-medium text-slate-400">
                                Addons: {it.addons.map((a: any) => a.name).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="font-black text-slate-900">
                            ₹{Math.round((it.itemTotalPaise || (it.pricePaise * it.quantity) || 0) / 100)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span>₹{Math.round((selectedOrderForDrawer.subtotalPaise || 0) / 100)}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>GST Tax (5%)</span>
                      <span>₹{Math.round((selectedOrderForDrawer.taxPaise || 0) / 100)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                      <span>Total Paid</span>
                      <span className="text-emerald-600">₹{Math.round((selectedOrderForDrawer.totalAmountPaise || 0) / 100)}</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">Payment Information</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                        {selectedOrderForDrawer.paymentStatus || 'PAID'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800">Method: {selectedOrderForDrawer.paymentMethod || 'UPI'}</div>
                    {selectedOrderForDrawer.transactionId && (
                      <div className="font-mono text-[10px] text-slate-500">Txn: {selectedOrderForDrawer.transactionId}</div>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedOrderForDrawer.notes && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
                      <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Customer Notes</span>
                      <p className="text-amber-900 font-medium italic">"{selectedOrderForDrawer.notes}"</p>
                    </div>
                  )}

                </div>

                {/* Drawer Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-2">
                  <button
                    onClick={() => {
                      const idToUse = selectedOrderForDrawer.orderId || selectedOrderForDrawer._id;
                      setSelectedOrderForDrawer(null);
                      handleOpenEBillModal(idToUse);
                    }}
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View & Print E-Bill</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DIGITAL E-BILL PRINTABLE MODAL ─────────────────────────────────── */}
      {selectedOrderForBill && (
        <Modal
          title={`E-Bill Tax Invoice · ${selectedOrderForBill.orderId || selectedOrderForBill.billNumber}`}
          onClose={() => setSelectedOrderForBill(null)}
          maxWidth="max-w-lg"
        >
          <div className="space-y-6" id="printable-ebill">
            
            {/* Bill Receipt Card Layout */}
            <div className="p-6 bg-white border border-slate-300 rounded-2xl shadow-inner font-mono text-xs text-slate-800 space-y-4">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-base flex items-center justify-center mx-auto mb-2">
                  <Coffee className="w-5 h-5" />
                </div>
                <h2 className="text-base font-black uppercase text-slate-900 tracking-wider">
                  {selectedOrderForBill.restaurant?.name || 'THE ARTISAN ROASTERY & CAFÉ'}
                </h2>
                <p className="text-[10px] text-slate-500 font-sans">{selectedOrderForBill.restaurant?.address || 'Bandra West, Mumbai'}</p>
                <p className="text-[10px] text-slate-500 font-sans">Phone: {selectedOrderForBill.restaurant?.phone || '+91 9876543210'}</p>
                <div className="pt-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                    TAX INVOICE / E-BILL
                  </span>
                </div>
              </div>

              {/* Order Info Bar */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-dashed border-slate-300 pb-3">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Order ID</span>
                  <span className="font-black text-orange-600">{selectedOrderForBill.orderId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Date & Time</span>
                  <span className="font-bold">{new Date(selectedOrderForBill.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Customer</span>
                  <span className="font-bold">{selectedOrderForBill.customer?.name || 'Guest'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Table</span>
                  <span className="font-bold">{selectedOrderForBill.table || 'Takeaway'}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-slate-300 text-slate-400 text-[9px] uppercase">
                  <tr>
                    <th className="py-1">ITEM</th>
                    <th className="py-1 text-center">QTY</th>
                    <th className="py-1 text-right">PRICE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans font-semibold">
                  {selectedOrderForBill.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-900">
                        {item.name}
                        {item.variantName && <span className="block text-[9px] text-slate-400">({item.variantName})</span>}
                      </td>
                      <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-900 font-bold">
                        ₹{Math.round((item.itemTotalPaise || (item.pricePaise * item.quantity)) / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Receipt Total Calculation */}
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-xs font-sans">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{Math.round((selectedOrderForBill.subtotalPaise || 0) / 100)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST ({selectedOrderForBill.restaurant?.taxRatePercentage || 5}%)</span>
                  <span>₹{Math.round((selectedOrderForBill.taxPaise || 0) / 100)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>GRAND TOTAL</span>
                  <span className="text-emerald-600 font-mono text-base">₹{Math.round((selectedOrderForBill.totalAmountPaise || 0) / 100)}</span>
                </div>
              </div>

              {/* Payment Status Bar */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5 font-sans">
                <div className="text-[10px] font-extrabold uppercase text-slate-500">
                  PAYMENT METHOD: {selectedOrderForBill.paymentMethod || 'UPI'} · STATUS: <span className="text-emerald-600">{selectedOrderForBill.paymentStatus || 'PAID'}</span>
                </div>
                {selectedOrderForBill.transactionId && (
                  <div className="text-[9px] font-mono text-slate-400">Ref Txn: {selectedOrderForBill.transactionId}</div>
                )}
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-2 text-[10px] font-sans text-slate-400 space-y-1">
                <p>Thank you for visiting! ❤️</p>
                <p className="font-mono text-[9px]">Powered by Café Flow POS System</p>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => window.print()}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>

              <button
                onClick={() => {
                  showToast('📋 E-Bill digital receipt copied!');
                }}
                className="py-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-black text-xs transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Digital Bill</span>
              </button>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
};
export default OwnerDashboard;
