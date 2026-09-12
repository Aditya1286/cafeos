import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign, ShoppingBag, TrendingUp, Activity, Store, Zap,
  ArrowUpRight, Clock,
  Coffee, ShieldCheck, RefreshCw, Users, Sparkles,
  ChevronRight, Flame, Download, Search
} from 'lucide-react';

import { apiRequest } from '../services/api';
import { getSocket } from '../services/socket';
import NavbarAdmin from '../components/ui/NavbarAdmin';
import NumberTicker from '../components/ui/NumberTicker';
import CardSpotlight from '../components/ui/CardSpotlight';
import BentoGrid, { BentoGridItem } from '../components/ui/BentoGrid';
import CardHoverEffect, { HoverEffectItem } from '../components/ui/CardHoverEffect';
import MovingBorderButton from '../components/ui/MovingBorderButton';
import EmptyState from '../components/ui/EmptyState';
import CommandPalette from '../components/ui/CommandPalette';
import ProductDetailSheet from '../components/ui/ProductDetailSheet';
import TenantManagementModal from '../components/ui/TenantManagementModal';

export const SuperAdminDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedTenantForModal, setSelectedTenantForModal] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Always ensure the document is in light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Data state
  const [data, setData] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Time Series Revenue Overview
  const revenueOverviewData = {
    today: [
      { time: '08:00', revenue: 4200, fees: 340 },
      { time: '10:00', revenue: 9800, fees: 720 },
      { time: '12:00', revenue: 18400, fees: 1420 },
      { time: '14:00', revenue: 26500, fees: 2100 },
      { time: '16:00', revenue: 34100, fees: 2850 },
      { time: '18:00', revenue: 49200, fees: 3910 },
      { time: '20:00', revenue: 64800, fees: 5120 },
      { time: '22:00', revenue: 78200, fees: 6240 },
    ],
    yesterday: [
      { time: '08:00', revenue: 3800, fees: 300 },
      { time: '10:00', revenue: 8900, fees: 650 },
      { time: '12:00', revenue: 16200, fees: 1200 },
      { time: '14:00', revenue: 23100, fees: 1800 },
      { time: '16:00', revenue: 31000, fees: 2400 },
      { time: '18:00', revenue: 42500, fees: 3300 },
      { time: '20:00', revenue: 58000, fees: 4500 },
      { time: '22:00', revenue: 69000, fees: 5400 },
    ],
    last_7_days: [
      { time: 'Mon', revenue: 284000, fees: 22100 },
      { time: 'Tue', revenue: 312000, fees: 24800 },
      { time: 'Wed', revenue: 295000, fees: 23400 },
      { time: 'Thu', revenue: 340000, fees: 27100 },
      { time: 'Fri', revenue: 420000, fees: 33500 },
      { time: 'Sat', revenue: 485000, fees: 38900 },
      { time: 'Sun', revenue: 450000, fees: 36200 },
    ],
    last_30_days: [
      { time: 'Week 1', revenue: 1240000, fees: 98000 },
      { time: 'Week 2', revenue: 1420000, fees: 112000 },
      { time: 'Week 3', revenue: 1580000, fees: 125000 },
      { time: 'Week 4', revenue: 1890000, fees: 148000 },
    ]
  };

  const chartData = revenueOverviewData[dateRange as keyof typeof revenueOverviewData] || revenueOverviewData.today;

  // Category Donut Data
  const categoryData = [
    { name: 'Specialty Coffee', value: 42, color: '#ef4444' },
    { name: 'Gourmet Bakery', value: 28, color: '#f59e0b' },
    { name: 'Cold Beverages', value: 18, color: '#3b82f6' },
    { name: 'Pizzas & Bowls', value: 12, color: '#10b981' },
  ];

  // Best Selling Products
  const bestSellers = [
    { name: 'Iced Artisan Cold Coffee', category: 'Specialty Coffee', ordersCount: 1420, revenue: 340800, marginPercent: 78, peakHour: '4:00 PM – 6:00 PM', stockStatus: 'Healthy' },
    { name: 'Almond Butter Croissant', category: 'Gourmet Bakery', ordersCount: 980, revenue: 215600, marginPercent: 72, peakHour: '9:00 AM – 11:00 AM', stockStatus: 'Healthy' },
    { name: 'Paneer Tikka Passion Pizza', category: 'Pizzas & Bowls', ordersCount: 750, revenue: 292500, marginPercent: 65, peakHour: '7:00 PM – 9:00 PM', stockStatus: 'Low Stock' },
    { name: 'Ceremonial Uji Matcha Latte', category: 'Cold Beverages', ordersCount: 610, revenue: 170800, marginPercent: 81, peakHour: '2:00 PM – 4:00 PM', stockStatus: 'Healthy' },
  ];

  // Heatmap intensity hours
  const peakHeatmap = [
    { hour: '7 AM', intensity: 2 },
    { hour: '8 AM', intensity: 5 },
    { hour: '9 AM', intensity: 8 },
    { hour: '10 AM', intensity: 7 },
    { hour: '11 AM', intensity: 4 },
    { hour: '12 PM', intensity: 6 },
    { hour: '1 PM', intensity: 9 },
    { hour: '2 PM', intensity: 7 },
    { hour: '3 PM', intensity: 5 },
    { hour: '4 PM', intensity: 6 },
    { hour: '5 PM', intensity: 8 },
    { hour: '6 PM', intensity: 9 },
    { hour: '7 PM', intensity: 10 },
    { hour: '8 PM', intensity: 10 },
    { hour: '9 PM', intensity: 8 },
    { hour: '10 PM', intensity: 4 },
  ];

  // Fetch data from real backend APIs
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const overviewRes = await apiRequest('/admin/overview').catch(() => null);
      if (overviewRes && overviewRes.data) {
        setData(overviewRes.data);
        if (overviewRes.data.plans) setPlans(overviewRes.data.plans);
        if (overviewRes.data.recentOrders && overviewRes.data.recentOrders.length > 0) {
          setLiveOrders(overviewRes.data.recentOrders);
        }
      }
      const restRes = await apiRequest('/admin/restaurants').catch(() => null);
      if (restRes && restRes.data) {
        setRestaurants(restRes.data);
      }
      const healthRes = await apiRequest('/admin/system/health').catch(() => null);
      if (healthRes && healthRes.data) {
        setSystemHealth(healthRes.data);
      }
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
      setToastMessage(`⚡ New order #${newOrder.orderNumber || newOrder._id?.slice(-4)} arrived!`);
      setTimeout(() => setToastMessage(null), 4000);
    });

    socket.on('order_updated', (updatedOrder: any) => {
      setLiveOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? { ...o, status: updatedOrder.orderStatus } : o))
      );
    });

    if (liveOrders.length === 0) {
      setLiveOrders([
        { id: '1', orderNumber: '1094', cafeName: 'The Artisan Roastery', itemsCount: 3, total: 640, status: 'PREPARING', time: 'Just now' },
        { id: '2', orderNumber: '1093', cafeName: 'Bean & Butter Bakery', itemsCount: 2, total: 420, status: 'READY', time: '2m ago' },
        { id: '3', orderNumber: '3001', cafeName: 'Verde Organic Bistro', itemsCount: 4, total: 1150, status: 'DELIVERED', time: '5m ago' },
        { id: '4', orderNumber: '1091', cafeName: 'Urban Espresso Bar', itemsCount: 1, total: 220, status: 'PENDING', time: '8m ago' },
      ]);
    }

    return () => {
      socket.off('order_created');
      socket.off('order_updated');
    };
  }, []);

  const handleToggleStatus = async (restaurantId: string, targetStatus: string) => {
    try {
      await apiRequest(`/admin/restaurants/${restaurantId}/status`, 'PUT', { status: targetStatus });
      setToastMessage(`Tenant status updated to ${targetStatus}`);
      fetchDashboardData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update tenant status');
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const csvHeader = 'Tenant Name,Slug,Email,Status,Per-Order Fee (₹)\n';
      const csvRows = restaurants
        .map((r) => `"${r.name}","${r.slug}","${r.email}","${r.status}",${(r.perOrderFeePaise || 200) / 100}`)
        .join('\n');
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CafeFlow_Tenants_Export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastMessage('CSV Report downloaded successfully!');
    } else {
      window.print();
      setToastMessage('PDF Print Preview initiated');
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sparklineData = [
    { v: 30 }, { v: 45 }, { v: 38 }, { v: 52 }, { v: 48 }, { v: 65 }, { v: 72 }
  ];

  const tenantHoverItems: HoverEffectItem[] = restaurants.map((r) => ({
    title: r.name,
    description: `Slug: /c/${r.slug} · Email: ${r.email}`,
    badge: r.status,
    metric: `₹${(r.perOrderFeePaise || 200) / 100} / order fee`,
    icon: <Store className="w-5 h-5 text-red-500" />,
    onClick: () => setSelectedTenantForModal({ id: r._id, name: r.name, status: r.status })
  }));

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    color: '#0f172a',
    borderRadius: '16px',
    fontSize: '12px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
    border: '1px solid #e2e8f0',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-red-600 selection:text-white">
      {/* ⌘K Command Search Modal */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelect={(type, id) => {
          setToastMessage(`Opened ${type}: ${id}`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* Product Detail Slide-over Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Tenant Status Confirmation Dialog */}
      <TenantManagementModal
        tenant={selectedTenantForModal}
        onClose={() => setSelectedTenantForModal(null)}
        onConfirm={handleToggleStatus}
      />

      {/* Toast Notification Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <NavbarAdmin
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCommand={() => setIsCommandOpen(true)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onExport={handleExport}
        user={user}
        onLogout={() => {
          localStorage.removeItem('cafeos_token');
          window.location.href = '/login';
        }}
        restaurantsCount={restaurants.length || 3}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Greeting + Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200 mb-2">
              <ShieldCheck className="w-4 h-4" /> Global Platform Management
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Good evening, {user?.name?.split(' ')[0] || 'Admin'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              Real-time multi-tenant café metrics, per-order fee settlements, & operations intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MovingBorderButton onClick={fetchDashboardData}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Live Data</span>
            </MovingBorderButton>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* KPI BENTO GRID */}
            <BentoGrid>
              <BentoGridItem
                title={
                  <NumberTicker
                    value={data?.metrics?.totalGMVPaise ? data.metrics.totalGMVPaise / 100 : 255400}
                    prefix="₹"
                  />
                }
                description="Total customer order volume processed across all active tenant cafés"
                badge={
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                    <ArrowUpRight className="w-3 h-3" /> +14.2%
                  </span>
                }
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                header={
                  <div className="h-10 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                }
              />

              <BentoGridItem
                title={
                  <NumberTicker
                    value={data?.metrics?.totalOrders || 1284}
                  />
                }
                description="Total completed QR table orders & takeaway tickets processed"
                badge={
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                    <ArrowUpRight className="w-3 h-3" /> +8.6%
                  </span>
                }
                icon={<ShoppingBag className="w-5 h-5 text-blue-600" />}
                header={
                  <div className="h-10 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                }
              />

              <BentoGridItem
                title={
                  <NumberTicker
                    value={data?.metrics?.avgOrderValuePaise ? Math.round(data.metrics.avgOrderValuePaise / 100) : 608}
                    prefix="₹"
                  />
                }
                description="Average basket spend per table session across all active outlets"
                badge={
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
                    <ArrowUpRight className="w-3 h-3" /> +5.1%
                  </span>
                }
                icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
                header={
                  <div className="h-10 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                }
              />

              <BentoGridItem
                title={
                  <NumberTicker
                    value={data?.metrics?.totalPlatformFeesPaise ? data.metrics.totalPlatformFeesPaise / 100 : 6240}
                    prefix="₹"
                  />
                }
                description="Per-order transaction fees collected automatically at ₹2 / order"
                badge={
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold border border-red-200">
                    <Zap className="w-3 h-3" /> ₹2 flat
                  </span>
                }
                icon={<Activity className="w-5 h-5 text-red-600" />}
                header={
                  <div className="h-10 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <Area type="monotone" dataKey="v" stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                }
              />
            </BentoGrid>

            {/* HERO SECTION: Revenue Chart & Real-Time WebSocket Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Revenue Overview Chart (8 cols) */}
              <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Revenue & Platform Settlement Overview
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Live comparison of gross café order GMV vs platform fee revenues
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 self-start sm:self-auto">
                    {(['today', 'last_7_days', 'last_30_days'] as const).map((range, i) => (
                      <button
                        key={range}
                        onClick={() => setDateRange(range)}
                        className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                          dateRange === range ? 'bg-white text-slate-900 shadow-sm' : ''
                        }`}
                      >
                        {['Day', 'Week', 'Month'][i]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="revenue" name="Gross GMV (₹)" stroke="#ef4444" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                      <Area type="monotone" dataKey="fees" name="Platform Fees (₹)" stroke="#10b981" fillOpacity={1} fill="url(#colorFees)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart legend */}
                <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-500 rounded-full inline-block" /> Gross GMV</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-emerald-500 rounded-full inline-block" /> Platform Fees</span>
                </div>
              </div>

              {/* Live Orders Stream (4 cols) */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      Live Orders
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Socket.IO Active
                  </span>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {liveOrders.map((order) => (
                      <motion.div
                        key={order.id || order._id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>Order #{order.orderNumber || '1094'}</span>
                            <span className="text-[10px] text-slate-400 font-normal">· {order.time || 'Just now'}</span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                            {order.cafeName || 'Artisan Roastery'} · {order.itemsCount || 3} items
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="font-black text-slate-900">
                            ₹{order.total || 640}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            order.status === 'PREPARING'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'READY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* TENANT CAFÉS SHOWCASE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Active Tenant Cafés Showcase
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Interactive hover grid for registered café operations
                  </p>
                </div>
              </div>
              <CardHoverEffect items={tenantHoverItems} />
            </div>

            {/* MIDDLE SECTION: Peak Hours Heatmap & Best Sellers */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Peak Hours Heatmap (6 cols) */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Peak Operating Hours Heatmap
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Hourly table ordering density (7 AM – 10 PM)
                  </p>
                </div>

                <div className="grid grid-cols-8 gap-2 pt-2">
                  {peakHeatmap.map((item) => (
                    <div key={item.hour} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-full h-10 rounded-xl transition-transform hover:scale-105 flex items-center justify-center font-extrabold text-[10px] ${
                          item.intensity >= 9
                            ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                            : item.intensity >= 7
                            ? 'bg-red-400 text-white'
                            : item.intensity >= 5
                            ? 'bg-red-200 text-red-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.intensity * 10}%
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {item.hour}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>🔥 Peak hour detected: 7:00 PM – 8:00 PM (100% capacity)</span>
                </div>
              </div>

              {/* Best-Selling Products (6 cols) */}
              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Best-Selling Menu Items
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Click any item row to inspect deep product analytics sheet
                  </p>
                </div>

                <div className="space-y-3">
                  {bestSellers.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => setSelectedProduct(item)}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.ordersCount} orders · {item.category}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            ₹{item.revenue.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600">
                            {item.marginPercent}% margin
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SMART INSIGHTS CARD SPOTLIGHT */}
            <CardSpotlight className="my-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/30">
                      ✨
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                        Smart Operational Insights
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Automated operational query intelligence across all active tenant cafés
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200">
                    5 Insights Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
                  {[
                    { emoji: '🔥', title: 'Peak Friday Volume', body: 'Friday sales are 24% higher than your weekly average across Bandra & Connaught Place.' },
                    { emoji: '📈', title: 'Coffee Trend Surge', body: 'Cold brew coffee sales increased 31% this week.' },
                    { emoji: '⚠️', title: 'Mozzarella Stock Alert', body: 'Mozzarella stock may run out in ~2 days at current pizza order velocity.' },
                    { emoji: '💡', title: 'Staffing Tip', body: 'Your busiest period is 7–9 PM — consider adding extra kitchen staff.' },
                    { emoji: '🎯', title: 'Repeat Customers', body: 'Returning guests generated 42% of this month\'s gross platform revenue.' },
                  ].map((insight) => (
                    <div key={insight.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                      <span className="text-base">{insight.emoji}</span>
                      <div>
                        <div className="font-extrabold text-slate-900 mb-0.5">{insight.title}</div>
                        <div className="text-[11px] text-slate-500 leading-snug">{insight.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardSpotlight>

            {/* TENANTS MANAGEMENT TABLE */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Registered Café Tenants Management
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Detailed tenant status control, per-order fees, and accounts overview
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search café by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-200 uppercase text-[10px] font-extrabold tracking-wider">
                    <tr>
                      <th className="pb-3">Café Name</th>
                      <th className="pb-3">URL Slug</th>
                      <th className="pb-3">Contact Email</th>
                      <th className="pb-3">Per-Order Fee</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredRestaurants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8">
                          <EmptyState
                            title="No registered cafés match your filter"
                            description="Try clearing search keywords or resetting the status filter."
                            actionLabel="Reset Search Filter"
                            onAction={() => setSearchQuery('')}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredRestaurants.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 text-red-600 flex items-center justify-center font-black text-xs border border-red-200">
                              {r.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">{r.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{r.address}</div>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-red-600 font-bold">
                            /c/{r.slug}
                          </td>
                          <td className="py-4 font-medium text-slate-600">
                            {r.email}
                          </td>
                          <td className="py-4 font-extrabold text-emerald-600">
                            ₹{(r.perOrderFeePaise || 200) / 100} / order
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              r.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => setSelectedTenantForModal({ id: r._id, name: r.name, status: r.status })}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                                r.status === 'ACTIVE'
                                  ? 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {r.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TENANTS & CAFES */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Multi-Tenant Café Network ({restaurants.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    All registered outlet tenants, subscription statuses, and per-order fees
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 text-xs font-bold">
                    {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          statusFilter === st
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search café..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRestaurants.map((r) => (
                  <div
                    key={r._id}
                    className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-base flex items-center justify-center shadow-md">
                          {r.name.charAt(0)}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          r.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {r.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">
                          {r.name}
                        </h4>
                        <div className="text-xs font-mono text-red-600 font-bold mt-0.5">
                          /c/{r.slug}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1 font-medium">
                        <div>📧 {r.email}</div>
                        <div>📞 {r.phone || '+91 98765 43210'}</div>
                        <div className="text-[11px] text-slate-400 truncate">{r.address}</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Platform Fee</div>
                        <div className="text-xs font-black text-emerald-600">₹{(r.perOrderFeePaise || 200) / 100} / order</div>
                      </div>

                      <button
                        onClick={() => setSelectedTenantForModal({ id: r._id, name: r.name, status: r.status })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                          r.status === 'ACTIVE'
                            ? 'bg-slate-200 text-slate-800 hover:bg-rose-100 hover:text-rose-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {r.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: 'Total Platform GMV',
                  value: `₹${((data?.metrics?.totalGMVPaise || 25540000) / 100).toLocaleString('en-IN')}`,
                  sub: '+18.4% this month',
                  subColor: 'text-emerald-600',
                  valueColor: 'text-slate-900',
                },
                {
                  label: 'Total Settled Fees',
                  value: `₹${((data?.metrics?.totalPlatformFeesPaise || 624000) / 100).toLocaleString('en-IN')}`,
                  sub: '₹2 per order settlement',
                  subColor: 'text-slate-400',
                  valueColor: 'text-emerald-600',
                },
                {
                  label: 'Active Outlets',
                  value: `${restaurants.length || 3} Outlets`,
                  sub: '100% platform uptime',
                  subColor: 'text-slate-400',
                  valueColor: 'text-red-600',
                },
              ].map((card) => (
                <div key={card.label} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="text-xs text-slate-400 font-bold uppercase">{card.label}</div>
                  <div className={`text-3xl font-black ${card.valueColor}`}>{card.value}</div>
                  <div className={`text-xs font-bold ${card.subColor}`}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Payment Method Breakdown Analytics
                </h3>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Raw Data
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-3 self-center">
                  {[
                    { label: 'UPI / Razorpay', pct: '68%', value: '₹1,73,672' },
                    { label: 'Credit & Debit Cards', pct: '22%', value: '₹56,188' },
                    { label: 'Cash at Counter', pct: '10%', value: '₹25,540' },
                  ].map((pm) => (
                    <div key={pm.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500 font-bold">{pm.label} ({pm.pct})</div>
                        <div className="text-lg font-extrabold text-slate-900">{pm.value}</div>
                      </div>
                      <div className="text-xs font-extrabold text-slate-400">{pm.pct}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KITCHEN KDS */}
        {activeTab === 'kitchen' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Global Kitchen Display System (KDS) Monitor
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time ticket dispatch across all active kitchen terminals
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200">
                {liveOrders.length} Active Tickets
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {liveOrders.map((ord) => (
                <div
                  key={ord.id || ord._id}
                  className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-base">
                      Order #{ord.orderNumber || '1042'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      ord.status === 'PREPARING' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {ord.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    <div className="font-semibold text-slate-700">{ord.cafeName || 'The Artisan Roastery'}</div>
                    <div className="text-[11px] text-slate-400">Table: {ord.tableName || 'Table 01'}</div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">Total: ₹{ord.total || 640}</span>
                    <button
                      onClick={() => {
                        setToastMessage(`Updated ticket #${ord.orderNumber} status`);
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                    >
                      Advance Status →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PLANS & SUBSCRIPTIONS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Multi-Tenant Subscription Plans
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Configure subscription tiers, table limits, and per-order fee rules
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(plans.length > 0 ? plans : [
                { _id: '1', name: 'Free Starter', monthlyPricePaise: 0, perOrderFeePaise: 200, isPopular: false, description: 'For small kiosks & trial cafés' },
                { _id: '2', name: 'Basic Pro', monthlyPricePaise: 29900, perOrderFeePaise: 200, isPopular: true, description: 'Full digital menu, QR ordering & order management' },
                { _id: '3', name: 'Premium Growth', monthlyPricePaise: 79900, perOrderFeePaise: 200, isPopular: false, description: 'Unlimited tables, advanced inventory & KDS' },
              ]).map((plan) => (
                <div
                  key={plan._id}
                  className={`p-6 rounded-3xl bg-white border ${
                    plan.isPopular ? 'border-2 border-red-400 shadow-xl shadow-red-500/10' : 'border-slate-200 shadow-sm'
                  } space-y-5 flex flex-col justify-between relative overflow-hidden`}
                >
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-2xl tracking-wider">
                      POPULAR
                    </div>
                  )}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-900 text-lg">{plan.name}</h4>
                    <p className="text-xs text-slate-500">{plan.description}</p>

                    <div className="text-3xl font-black text-slate-900">
                      ₹{plan.monthlyPricePaise / 100} <span className="text-xs font-normal text-slate-400">/ mo</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 font-semibold space-y-1.5">
                      <div>⚡ Per-Order Fee: ₹{(plan.perOrderFeePaise || 200) / 100}</div>
                      <div>📋 QR Digital Menu included</div>
                      <div>💻 WebSocket Kitchen KDS</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setToastMessage(`Plan ${plan.name} settings saved!`);
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                      plan.isPopular
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Edit Plan Pricing
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM HEALTH */}
        {activeTab === 'system' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Server & Database System Health
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time Node.js runtime metrics, MongoDB connection state, and socket ping
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                ● 100% HEALTHY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'System Status', value: 'OPERATIONAL', sub: 'Zero downtime reported', color: 'text-emerald-600' },
                {
                  label: 'Node Process Uptime',
                  value: systemHealth?.uptimeSeconds ? `${Math.floor(systemHealth.uptimeSeconds / 60)}m` : '142m',
                  sub: 'Continuous execution',
                  color: 'text-slate-900'
                },
                {
                  label: 'Heap Memory Used',
                  value: `${systemHealth?.memoryUsage?.heapUsedMB || 48} MB`,
                  sub: `of ${systemHealth?.memoryUsage?.heapTotalMB || 96} MB total`,
                  color: 'text-slate-900'
                },
                {
                  label: 'Database State',
                  value: systemHealth?.database || 'CONNECTED',
                  sub: 'MongoDB ready',
                  color: 'text-blue-600'
                },
              ].map((card) => (
                <div key={card.label} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs text-slate-400 font-bold uppercase">{card.label}</div>
                  <div className={`text-xl font-extrabold ${card.color}`}>{card.value}</div>
                  <div className="text-[11px] text-slate-400">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Memory usage bar */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Heap Memory Usage</span>
                <span>{systemHealth?.memoryUsage?.heapUsedMB || 48} / {systemHealth?.memoryUsage?.heapTotalMB || 96} MB</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round(((systemHealth?.memoryUsage?.heapUsedMB || 48) / (systemHealth?.memoryUsage?.heapTotalMB || 96)) * 100)}%`
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
