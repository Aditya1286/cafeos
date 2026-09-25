import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, FlaskConical } from 'lucide-react';
import MovingBorderButton from '@/atoms/MovingBorderButton';
import NavbarAdmin from '@/organisms/super-admin/NavbarAdmin';
import CommandPalette from '@/organisms/super-admin/CommandPalette';
import ProductDetailSheet from '@/organisms/super-admin/ProductDetailSheet';
import BusinessManagementModal from '@/organisms/super-admin/BusinessManagementModal';
import BusinessFinanceDrawer from '@/organisms/super-admin/BusinessFinanceDrawer';
import { APP_SLUG } from '../constants/app';
import { toast } from '../utils/toast';
import { downloadCsv } from '../utils/exportCsv';
import { AdminBusinessSummary } from '../types';

import { useSuperAdminDashboardData } from '../hooks/useSuperAdminDashboardData';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { useSuperAdminAnalytics } from '../hooks/useSuperAdminAnalytics';
import { useRemittanceQueue } from '../hooks/useRemittanceQueue';
import { useSubscriptionRequests } from '../hooks/useSubscriptionRequests';

import { KpiOverviewBento } from '@/organisms/super-admin/KpiOverviewBento';
import { RevenueChartPanel } from '@/organisms/super-admin/RevenueChartPanel';
import { LiveOrdersPanel } from '@/organisms/super-admin/LiveOrdersPanel';
import { BusinessConstellation } from '@/organisms/super-admin/BusinessConstellation';
import { BusinessSpotlightModal } from '@/organisms/super-admin/BusinessSpotlightModal';
import { CancellationRatePanel } from '@/organisms/super-admin/CancellationRatePanel';
import { BestSellersPanel } from '@/organisms/super-admin/BestSellersPanel';
import { PlatformInsightsPanel } from '@/organisms/super-admin/PlatformInsightsPanel';
import { BusinessHourlyHeatmapPanel } from '@/organisms/super-admin/BusinessHourlyHeatmapPanel';
import { BusinessesManagementTable } from '@/organisms/super-admin/BusinessesManagementTable';
import { BusinessesGridPanel, BusinessFilter } from '@/organisms/super-admin/BusinessesGridPanel';
import { matchesBusinessFilter } from '@/organisms/super-admin/BusinessesGridPanel/businessNetwork';
import { RemittanceQueueTable } from '@/organisms/super-admin/RemittanceQueueTable';
import { PlatformAnalyticsPanel } from '@/organisms/super-admin/PlatformAnalyticsPanel';
import { GlobalKitchenMonitor } from '@/organisms/super-admin/GlobalKitchenMonitor';
import { SubscriptionPlansPanel } from '@/organisms/super-admin/SubscriptionPlansPanel';
import { SubscriptionRequestsQueue } from '@/organisms/super-admin/SubscriptionRequestsQueue';
import { SystemHealthPanel } from '@/organisms/super-admin/SystemHealthPanel';
import { AdminRefundsPanel } from '@/organisms/super-admin/AdminRefundsPanel';
import { SupportTicketsPanel } from '@/organisms/super-admin/SupportTicketsPanel';
import { RefundHistoryModal } from '@/molecules/RefundHistoryModal';
import { useSupportDesk } from '../hooks/useSupportDesk';
import { useAdminRefunds } from '../hooks/useAdminRefunds';

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
  const [statusFilter, setStatusFilter] = useState<BusinessFilter>('ALL');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const {
    overview, businesses, liveOrders, loading, fetchDashboardData, handleToggleBusinessStatus, handleChangeBusinessPlan,
    updatingDemoId, handleSetBusinessDemo,
  } = useSuperAdminDashboardData();
  const { systemHealth } = useSystemHealth(activeTab === 'system');
  const { analyticsData, refresh: refreshAnalytics } = useSuperAdminAnalytics(dateRange);
  const remittanceQueue = useRemittanceQueue(activeTab);
  const subscriptionRequestsQueue = useSubscriptionRequests(activeTab);
  const adminRefunds = useAdminRefunds(activeTab === 'refunds');
  const supportDesk = useSupportDesk(activeTab === 'support');
  const [refundHistoryOrder, setRefundHistoryOrder] = useState<any | null>(null);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const header = 'Business Name,Menu Link,Email,Status,Fee per Order (%),Fees Owed (₹),Late (₹)\n';
      const rows = businesses
        .map((r) => `"${r.name}","${r.slug}","${r.email}","${r.status}",${r.commissionRatePercentage ?? 3},${(r.totalCommissionOwedPaise || 0) / 100},${(r.overdueAmountPaise || 0) / 100}`)
        .join('\n');
      downloadCsv(`${APP_SLUG}_businesses_export_${Date.now()}.csv`, header, rows);
      toast.success('Report downloaded!');
    } else {
      window.print();
      toast('Opening print view…');
    }
  };

  // The API already leaves demo businesses out of its aggregates; panels that derive analytics
  // client-side from the businesses list (constellation, insights, heatmap picker, counts) get
  // this pre-filtered list so they apply the same exclusion. Management views keep every business.
  const demoFilterEnabled = overview?.demoFilter?.enabled ?? false;
  const hiddenDemoCount = overview?.demoFilter?.excludedCount ?? 0;
  const analyticsBusinesses = demoFilterEnabled ? businesses.filter((b) => !b.isDemo) : businesses;

  // Overview metrics and the date-ranged analytics are separate requests — refresh both, or the
  // charts (payment methods, revenue, best sellers, ...) keep showing numbers from the last load.
  const refreshAll = () => {
    fetchDashboardData();
    refreshAnalytics();
  };

  const setBusinessDemo = async (businessId: string, isDemo: boolean) => {
    await handleSetBusinessDemo(businessId, isDemo);
    refreshAnalytics();
  };

  const filteredBusinesses = businesses.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && matchesBusinessFilter(r, statusFilter);
  });

  return (
    <div className="dashboard-compact-type min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-red-600 selection:text-white">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-extrabold border border-red-200 mb-2">
              <ShieldCheck className="w-4 h-4" /> Global Platform Management
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Good evening, {user?.name?.split(' ')[0] || 'Admin'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              See how every business is doing, what fees they owe, and what's been paid.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <MovingBorderButton onClick={refreshAll}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </MovingBorderButton>
          </div>
        </div>

        {demoFilterEnabled && hiddenDemoCount > 0 && (activeTab === 'overview' || activeTab === 'analytics') && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span>
              {hiddenDemoCount} demo account{hiddenDemoCount === 1 ? ' is' : 's are'} not counted in these numbers.
              Manage them from the Businesses tab.
            </span>
          </div>
        )}

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

            <BusinessConstellation businesses={analyticsBusinesses} onSelectBusiness={setSpotlightBusiness} />

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
              businesses={analyticsBusinesses}
              peakHeatmap={analyticsData?.peakHeatmap ?? []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <BusinessHourlyHeatmapPanel businesses={analyticsBusinesses} />
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
            allBusinesses={businesses}
            businesses={filteredBusinesses}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onOpenFinance={setSelectedBusinessForFinance}
            onOpenStatusModal={setSelectedBusinessForModal}
            updatingDemoId={updatingDemoId}
            onSetDemo={setBusinessDemo}
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
            activeBusinessesCount={overview?.metrics?.activeBusinesses ?? analyticsBusinesses.filter((b) => b.status === 'ACTIVE').length}
            totalBusinessesCount={analyticsBusinesses.length}
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
