import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import MovingBorderButton from '../components/ui/MovingBorderButton';
import NavbarAdmin from '../components/ui/NavbarAdmin';
import CommandPalette from '../components/ui/CommandPalette';
import ProductDetailSheet from '../components/ui/ProductDetailSheet';
import BusinessManagementModal from '../components/ui/BusinessManagementModal';
import BusinessFinanceDrawer from '../components/ui/BusinessFinanceDrawer';
import { APP_SLUG } from '../constants/app';
import { toast } from '../utils/toast';
import { downloadCsv } from '../utils/exportCsv';

import { useSuperAdminDashboardData } from '../hooks/useSuperAdminDashboardData';
import { useSuperAdminAnalytics } from '../hooks/useSuperAdminAnalytics';
import { useRemittanceQueue } from '../hooks/useRemittanceQueue';

import { KpiOverviewBento } from '../components/organisms/super-admin/KpiOverviewBento';
import { RevenueChartPanel } from '../components/organisms/super-admin/RevenueChartPanel';
import { LiveOrdersPanel } from '../components/organisms/super-admin/LiveOrdersPanel';
import { BusinessesShowcase } from '../components/organisms/super-admin/BusinessesShowcase';
import { PeakHoursHeatmap } from '../components/organisms/super-admin/PeakHoursHeatmap';
import { BestSellersPanel } from '../components/organisms/super-admin/BestSellersPanel';
import { PlatformInsightsPanel } from '../components/organisms/super-admin/PlatformInsightsPanel';
import { BusinessesManagementTable } from '../components/organisms/super-admin/BusinessesManagementTable';
import { BusinessesGridPanel } from '../components/organisms/super-admin/BusinessesGridPanel';
import { RemittanceQueueTable } from '../components/organisms/super-admin/RemittanceQueueTable';
import { PlatformAnalyticsPanel } from '../components/organisms/super-admin/PlatformAnalyticsPanel';
import { GlobalKitchenMonitor } from '../components/organisms/super-admin/GlobalKitchenMonitor';
import { SubscriptionPlansPanel } from '../components/organisms/super-admin/SubscriptionPlansPanel';
import { SystemHealthPanel } from '../components/organisms/super-admin/SystemHealthPanel';

export const SuperAdminDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [darkMode, setDarkMode] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedBusinessForModal, setSelectedBusinessForModal] = useState<any>(null);
  const [selectedBusinessForFinance, setSelectedBusinessForFinance] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const { overview, businesses, liveOrders, systemHealth, loading, fetchDashboardData, handleToggleBusinessStatus } = useSuperAdminDashboardData();
  const { analyticsData } = useSuperAdminAnalytics(dateRange);
  const remittanceQueue = useRemittanceQueue(activeTab);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const header = 'Business Name,Slug,Email,Status,Commission Rate (%),Commission Owed (₹),Overdue (₹)\n';
      const rows = businesses
        .map((r) => `"${r.name}","${r.slug}","${r.email}","${r.status}",${r.commissionRatePercentage ?? 3},${(r.totalCommissionOwedPaise || 0) / 100},${(r.overdueAmountPaise || 0) / 100}`)
        .join('\n');
      downloadCsv(`${APP_SLUG}_businesses_export_${Date.now()}.csv`, header, rows);
      toast.success('CSV Report downloaded successfully!');
    } else {
      window.print();
      toast('PDF Print Preview initiated');
    }
  };

  const filteredBusinesses = businesses.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-red-600 selection:text-white">
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelect={(type, id) => toast(`Opened ${type}: ${id}`)}
      />

      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <BusinessManagementModal
        business={selectedBusinessForModal}
        onClose={() => setSelectedBusinessForModal(null)}
        onConfirm={handleToggleBusinessStatus}
      />

      <BusinessFinanceDrawer
        businessId={selectedBusinessForFinance}
        onClose={() => setSelectedBusinessForFinance(null)}
        onChanged={fetchDashboardData}
      />

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
          localStorage.removeItem(`${APP_SLUG}_token`);
          window.location.href = '/login';
        }}
        businessesCount={businesses.length}
        pendingRemittancesCount={remittanceQueue.pendingRemittancesCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200 mb-2">
              <ShieldCheck className="w-4 h-4" /> Global Platform Management
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Good evening, {user?.name?.split(' ')[0] || 'Admin'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              Real-time multi-tenant business metrics, commission accrual, & remittance tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MovingBorderButton onClick={fetchDashboardData}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Live Data</span>
            </MovingBorderButton>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <KpiOverviewBento metrics={overview?.metrics ?? null} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <RevenueChartPanel
                chartData={analyticsData?.revenueTimeseries ?? []}
                dateRange={dateRange}
                onChangeDateRange={setDateRange}
              />
              <LiveOrdersPanel liveOrders={liveOrders} />
            </div>

            <BusinessesShowcase businesses={businesses} onSelectBusiness={setSelectedBusinessForModal} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <PeakHoursHeatmap peakHeatmap={analyticsData?.peakHeatmap ?? []} />
              <BestSellersPanel bestSellers={analyticsData?.bestSellers ?? []} />
            </div>

            <PlatformInsightsPanel
              metrics={overview?.metrics ?? null}
              businesses={businesses}
              peakHeatmap={analyticsData?.peakHeatmap ?? []}
            />

            <BusinessesManagementTable
              businesses={filteredBusinesses}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenFinance={setSelectedBusinessForFinance}
              onOpenStatusModal={setSelectedBusinessForModal}
            />
          </>
        )}

        {activeTab === 'businesses' && (
          <BusinessesGridPanel
            businesses={filteredBusinesses}
            totalCount={businesses.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onOpenFinance={setSelectedBusinessForFinance}
            onOpenStatusModal={setSelectedBusinessForModal}
          />
        )}

        {activeTab === 'remittances' && (
          <RemittanceQueueTable
            remittanceView={remittanceQueue.remittanceView}
            onChangeView={remittanceQueue.setRemittanceView}
            pendingCount={remittanceQueue.pendingRemittancesCount}
            requests={remittanceQueue.remittanceRequests}
            loading={remittanceQueue.loadingRemittances}
            onMarkPaid={remittanceQueue.handleMarkRequestPaid}
            onUnmarkPaid={remittanceQueue.handleUnmarkRequestPaid}
          />
        )}

        {activeTab === 'analytics' && (
          <PlatformAnalyticsPanel
            metrics={overview?.metrics ?? null}
            activeBusinessesCount={overview?.metrics?.activeBusinesses ?? businesses.filter((b) => b.status === 'ACTIVE').length}
            totalBusinessesCount={businesses.length}
            paymentMethodBreakdown={analyticsData?.paymentMethodBreakdown ?? []}
            onExportCsv={() => handleExport('csv')}
          />
        )}

        {activeTab === 'kitchen' && (
          <GlobalKitchenMonitor liveOrders={liveOrders} />
        )}

        {activeTab === 'plans' && (
          <SubscriptionPlansPanel plans={overview?.plans ?? []} />
        )}

        {activeTab === 'system' && (
          <SystemHealthPanel systemHealth={systemHealth} />
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
