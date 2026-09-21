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
import { AdminBusinessSummary } from '../types';

import { useSuperAdminDashboardData } from '../hooks/useSuperAdminDashboardData';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { useSuperAdminAnalytics } from '../hooks/useSuperAdminAnalytics';
import { useRemittanceQueue } from '../hooks/useRemittanceQueue';
import { useSubscriptionRequests } from '../hooks/useSubscriptionRequests';

import { KpiOverviewBento } from '../components/organisms/super-admin/KpiOverviewBento';
import { RevenueChartPanel } from '../components/organisms/super-admin/RevenueChartPanel';
import { LiveOrdersPanel } from '../components/organisms/super-admin/LiveOrdersPanel';
import { BusinessConstellation } from '../components/organisms/super-admin/BusinessConstellation';
import { BusinessSpotlightModal } from '../components/organisms/super-admin/BusinessSpotlightModal';
import { CancellationRatePanel } from '../components/organisms/super-admin/CancellationRatePanel';
import { BestSellersPanel } from '../components/organisms/super-admin/BestSellersPanel';
import { PlatformInsightsPanel } from '../components/organisms/super-admin/PlatformInsightsPanel';
import { BusinessHourlyHeatmapPanel } from '../components/organisms/super-admin/BusinessHourlyHeatmapPanel';
import { BusinessesManagementTable } from '../components/organisms/super-admin/BusinessesManagementTable';
import { BusinessesGridPanel } from '../components/organisms/super-admin/BusinessesGridPanel';
import { RemittanceQueueTable } from '../components/organisms/super-admin/RemittanceQueueTable';
import { PlatformAnalyticsPanel } from '../components/organisms/super-admin/PlatformAnalyticsPanel';
import { GlobalKitchenMonitor } from '../components/organisms/super-admin/GlobalKitchenMonitor';
import { SubscriptionPlansPanel } from '../components/organisms/super-admin/SubscriptionPlansPanel';
import { SubscriptionRequestsQueue } from '../components/organisms/super-admin/SubscriptionRequestsQueue';
import { SystemHealthPanel } from '../components/organisms/super-admin/SystemHealthPanel';
import { AdminRefundsPanel } from '../components/organisms/super-admin/AdminRefundsPanel';
import { SupportTicketsPanel } from '../components/organisms/super-admin/SupportTicketsPanel';
import { RefundHistoryModal } from '../components/molecules/RefundHistoryModal';
import { useAdminRefunds } from '../hooks/useAdminRefunds';
import { useSupportDesk } from '../hooks/useSupportDesk';

export const SuperAdminDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('today');
  const [darkMode, setDarkMode] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedBusinessForModal, setSelectedBusinessForModal] = useState<any>(null);
  const [selectedBusinessForFinance, setSelectedBusinessForFinance] = useState<string | null>(null);
  const [spotlightBusiness, setSpotlightBusiness] = useState<AdminBusinessSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const { overview, businesses, liveOrders, loading, fetchDashboardData, handleToggleBusinessStatus, handleChangeBusinessPlan } = useSuperAdminDashboardData();
  const { systemHealth } = useSystemHealth(activeTab === 'system');
  const { analyticsData } = useSuperAdminAnalytics(dateRange);
  const remittanceQueue = useRemittanceQueue(activeTab);
  const subscriptionRequestsQueue = useSubscriptionRequests(activeTab);
  const adminRefunds = useAdminRefunds(activeTab === 'refunds');
  const supportDesk = useSupportDesk(activeTab === 'support');
  const [refundHistoryOrder, setRefundHistoryOrder] = useState<any | null>(null);

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

      <BusinessSpotlightModal
        business={spotlightBusiness}
        onClose={() => setSpotlightBusiness(null)}
        onOpenFinance={setSelectedBusinessForFinance}
        onOpenStatusModal={setSelectedBusinessForModal}
      />

      <RefundHistoryModal order={refundHistoryOrder} onClose={() => setRefundHistoryOrder(null)} />

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
        pendingSubscriptionRequestsCount={subscriptionRequestsQueue.pendingSubscriptionRequestsCount}
        refundsNeededCount={adminRefunds.insights?.needsRefundCount}
        openTicketsCount={supportDesk.needsAttentionCount}
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

            <BusinessConstellation businesses={businesses} onSelectBusiness={setSpotlightBusiness} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <CancellationRatePanel
                stats={analyticsData?.cancellationStats ?? null}
                timeseries={analyticsData?.cancellationTimeseries ?? []}
                worstBusinesses={analyticsData?.worstBusinessesByCancellation ?? []}
              />
              <BestSellersPanel bestSellers={analyticsData?.bestSellers ?? []} />
            </div>

            <PlatformInsightsPanel
              metrics={overview?.metrics ?? null}
              businesses={businesses}
              peakHeatmap={analyticsData?.peakHeatmap ?? []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <BusinessHourlyHeatmapPanel businesses={businesses} />
            </div>

            <BusinessesManagementTable
              businesses={filteredBusinesses}
              plans={overview?.plans ?? []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenFinance={setSelectedBusinessForFinance}
              onOpenStatusModal={setSelectedBusinessForModal}
              onChangePlan={handleChangeBusinessPlan}
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

        {activeTab === 'refunds' && (
          <AdminRefundsPanel
            businesses={businesses}
            orders={adminRefunds.orders}
            loading={adminRefunds.loading}
            insights={adminRefunds.insights}
            pagination={adminRefunds.pagination}
            onPageChange={(page) => adminRefunds.setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(limit) => adminRefunds.setPagination(prev => ({ ...prev, limit, page: 1 }))}
            searchQuery={adminRefunds.searchQuery}
            onSearchChange={adminRefunds.setSearchQuery}
            paymentStatusFilter={adminRefunds.paymentStatusFilter}
            onPaymentStatusFilterChange={adminRefunds.setPaymentStatusFilter}
            selectedBusinessId={adminRefunds.businessId}
            onSelectBusiness={adminRefunds.setBusinessId}
            onRefresh={adminRefunds.refresh}
            onViewHistory={setRefundHistoryOrder}
          />
        )}

        {activeTab === 'support' && (
          <SupportTicketsPanel
            currentUserId={user?.id}
            tickets={supportDesk.tickets}
            loading={supportDesk.loading}
            pagination={supportDesk.pagination}
            onPageChange={(page) => supportDesk.setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(limit) => supportDesk.setPagination(prev => ({ ...prev, limit, page: 1 }))}
            searchQuery={supportDesk.searchQuery}
            onSearchChange={supportDesk.setSearchQuery}
            statusFilter={supportDesk.statusFilter}
            onStatusFilterChange={supportDesk.setStatusFilter}
            onRefresh={supportDesk.refresh}
            onAssignToSelf={supportDesk.assignToSelf}
            onEscalate={supportDesk.escalate}
            onResolve={supportDesk.resolve}
            agents={supportDesk.agents}
            loadingAgents={supportDesk.loadingAgents}
            togglingAvailability={supportDesk.togglingAvailability}
            onToggleMyAvailability={supportDesk.toggleMyAvailability}
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
          <div className="space-y-8">
            <SubscriptionRequestsQueue
              requestsView={subscriptionRequestsQueue.requestsView}
              onChangeView={subscriptionRequestsQueue.setRequestsView}
              pendingCount={subscriptionRequestsQueue.pendingSubscriptionRequestsCount}
              requests={subscriptionRequestsQueue.subscriptionRequests}
              loading={subscriptionRequestsQueue.loadingSubscriptionRequests}
              onApprove={subscriptionRequestsQueue.handleApproveRequest}
              onReject={subscriptionRequestsQueue.handleRejectRequest}
            />
            <SubscriptionPlansPanel plans={overview?.plans ?? []} onPlansChanged={fetchDashboardData} />
          </div>
        )}

        {activeTab === 'system' && (
          <SystemHealthPanel systemHealth={systemHealth} />
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
