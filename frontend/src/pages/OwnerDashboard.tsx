import React, { useEffect, useState } from 'react';
import ordersService from '../services/dashboard/orders';
import menuService from '../services/dashboard/menu';
import tablesService from '../services/dashboard/tables';
import inventoryService from '../services/dashboard/inventory';
import { toast } from '../utils/toast';

import { useOwnerDashboardData } from '../hooks/useOwnerDashboardData';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { useRemittance } from '../hooks/useRemittance';
import { useCheckoutSettings } from '../hooks/useCheckoutSettings';
import { useSubscription } from '../hooks/useSubscription';
import { useRefundsAndCancellations } from '../hooks/useRefundsAndCancellations';
import { useStaff } from '../hooks/useStaff';
import { useAccountProfile } from '../hooks/useAccountProfile';

import { DashboardHeader, DashboardTab, tabsForRole } from '@/organisms/dashboard/DashboardHeader';
import { KpiStatsGrid } from '@/organisms/dashboard/KpiStatsGrid';
import { KitchenKdsBoard } from '@/organisms/dashboard/KitchenKdsBoard';
import { OrderHistoryPanel } from '@/organisms/dashboard/OrderHistoryPanel';
import { DigitalMenuPanel } from '@/organisms/dashboard/DigitalMenuPanel';
import { TablesQrPanel } from '@/organisms/dashboard/TablesQrPanel';
import { InventoryPanel } from '@/organisms/dashboard/InventoryPanel';
import { AnalyticsPanel } from '@/organisms/dashboard/AnalyticsPanel';
import { FinancialLedgerPanel } from '@/organisms/dashboard/FinancialLedgerPanel';
import { SettingsPanel } from '@/organisms/dashboard/SettingsPanel';
import { readFileAsDataUrl } from '@/utils/readFileAsDataUrl';
import { OrderDetailsDrawer } from '@/organisms/dashboard/OrderDetailsDrawer';
import { CancelOrderModal } from '@/organisms/dashboard/CancelOrderModal';
import { SupportWidget } from '@/organisms/SupportWidget';
import { DeleteProductModal } from '@/organisms/dashboard/DeleteProductModal';
import { EBillModal } from '@/organisms/dashboard/EBillModal';
import { AddProductModal } from '@/organisms/dashboard/AddProductModal';
import { AddTableModal } from '@/organisms/dashboard/AddTableModal';
import { AddInventoryModal } from '@/organisms/dashboard/AddInventoryModal';
import { RefundsPanel } from '@/organisms/dashboard/RefundsPanel';
import { StaffPanel } from '@/organisms/dashboard/StaffPanel';
import { ProfilePanel } from '@/organisms/dashboard/ProfilePanel';
import { RefundHistoryModal } from '@/molecules/RefundHistoryModal';
import { INVENTORY_ENABLED, SMEPAY_CHECKOUT_ENABLED } from '@/constants/features';

// Owner-side support widget is switched off for now — flip back to true to re-enable.
const SHOW_OWNER_SUPPORT_WIDGET = false;

export const OwnerDashboard = ({ user }: { user: any }) => {
  // Kitchen staff get a trimmed dashboard: the Kitchen board and their own profile, nothing else.
  const isStaff = user?.role === 'STAFF';
  const tabs = tabsForRole(user?.role);
  const [activeTab, setActiveTab] = useState<DashboardTab>('kds');
  // What's actually shown: the chosen tab if this role may open it, otherwise the Kitchen.
  // Everything below — which panel renders and which per-tab data gets fetched — keys off this,
  // never raw `activeTab`, so a stale or tampered tab can't render an owner-only section for
  // staff. (The tab bar already hides those, and the backend refuses their data regardless.)
  const visibleTab: DashboardTab =
    activeTab === 'profile' || tabs.some((t) => t.id === activeTab) ? activeTab : 'kds';
  const [copiedUrl, setCopiedUrl] = useState(false);

  const orderHistoryState = useOrderHistory(visibleTab === 'orders');

  const dashboard = useOwnerDashboardData({
    onOrderNew: (newOrder) => orderHistoryState.prependOrder(newOrder),
    onOrderUpdated: (updated) =>
      orderHistoryState.patchOrder(updated.orderId, { orderStatus: updated.orderStatus }),
    onCustomerMarkedPaid: (updated) =>
      orderHistoryState.patchOrder(updated.orderId, {
        customerMarkedPaidAt: updated.customerMarkedPaidAt,
      }),
    onRefundRequested: (updated) =>
      orderHistoryState.patchOrder(updated.orderId, {
        refundRequestedAt: updated.refundRequestedAt,
      }),
    // The history table only holds data while its tab is open; otherwise it loads fresh on open.
    onResync: () => {
      if (visibleTab === 'orders') orderHistoryState.fetchOrderHistory();
    },
    kitchenOnly: isStaff,
  });
  const {
    orders,
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
    savingUpiVpa,
    handleSaveUpiVpa,
    savingTaxRate,
    handleSaveTaxRate,
    savingTablesEnabled,
    handleToggleTablesEnabled,
    handleToggleTableActive,
    handleDeleteTable,
    handleMarkTableEmpty,
    savingMasterQr,
    handleToggleMasterQr,
    handleRemoveProduct,
    handleRestoreProduct,
    handleDeleteProduct,
  } = dashboard;
  const { remittanceSummary, loadingRemittance, markingPaid, handleMarkRemittancePaid } =
    useRemittance(visibleTab);
  const {
    subscriptionStatus,
    subscriptionPlans,
    loadingSubscription,
    requestingPlanId,
    markingUpgradePaid,
    cancellingUpgrade,
    handleRequestUpgrade,
    handleMarkUpgradePaid,
    handleCancelUpgrade,
  } = useSubscription(visibleTab);
  const refundsState = useRefundsAndCancellations(visibleTab === 'refunds');
  const checkoutState = useCheckoutSettings(SMEPAY_CHECKOUT_ENABLED && visibleTab === 'settings');
  const staffState = useStaff(visibleTab === 'staff');
  const account = useAccountProfile(visibleTab === 'profile');
  // The header reflects a picture/name change straight away, before the next login.
  const headerUser = account.profile
    ? { ...user, name: account.profile.name, avatarUrl: account.profile.avatarUrl }
    : user;

  // Drawer & Bill Modal states
  const [historyOrder, setHistoryOrder] = useState<any | null>(null);
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleteProductTarget, setDeleteProductTarget] = useState<any | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Add-entity modal open flags
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);

  // Add/Edit Product form — the same fields and modal serve both; `editingProductId`
  // set means "Save Changes" (PUT) instead of "Add to Menu" (POST).
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductPricePaise, setNewProductPricePaise] = useState(24900);
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductIsVeg, setNewProductIsVeg] = useState(true);
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductImagePreview, setNewProductImagePreview] = useState('');
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  // Inline "add category" from within the Add Product form
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Add Table form
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  // Add Inventory form
  const [newInvName, setNewInvName] = useState('');
  const [newInvUnit, setNewInvUnit] = useState('KG');
  const [newInvStock, setNewInvStock] = useState(10);
  const [newInvMinStock, setNewInvMinStock] = useState(3);
  const [newInvCostPaise, setNewInvCostPaise] = useState(40000);

  // UPI settings form
  const [upiVpaInput, setUpiVpaInput] = useState('');
  useEffect(() => {
    setUpiVpaInput(business?.upiVpa || '');
  }, [business?.upiVpa]);

  // Cmd+K / Ctrl+K jumps to the order search box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('orders');
        setTimeout(() => document.getElementById('order-search-input')?.focus(), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenOrderDrawer = async (order: any) => {
    setSelectedOrderForDrawer(order);
    try {
      const res = await ordersService.get(order.orderId || order._id);
      if (res.success) setSelectedOrderDetails(res.data);
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
  };

  const handleOpenEBillModal = async (orderId: string) => {
    try {
      const res = await ordersService.getBill(orderId);
      if (res.success) setSelectedOrderForBill(res.data);
    } catch (err) {
      console.error('Failed to load bill data:', err);
      toast.error('Could not load bill details.');
    }
  };

  const patchOrderEverywhere = (orderId: string, patch: Record<string, any>) => {
    orderHistoryState.patchOrder(orderId, patch);
    refundsState.patchOrder(orderId, patch);
    if (
      selectedOrderForDrawer &&
      (selectedOrderForDrawer._id === orderId || selectedOrderForDrawer.orderId === orderId)
    ) {
      setSelectedOrderForDrawer((prev: any) => ({ ...prev, ...patch }));
    }
    if (historyOrder && (historyOrder._id === orderId || historyOrder.orderId === orderId)) {
      setHistoryOrder((prev: any) => ({ ...prev, ...patch }));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await handleUpdateOrderStatus(orderId, status);
      patchOrderEverywhere(orderId, {
        orderStatus: status,
        ...(status === 'REFUNDED' ? { paymentStatus: 'REFUNDED' } : {}),
      });
    } catch {
      // handleUpdateOrderStatus already surfaced a toast
    }
  };

  const handleMarkRefunded = (order: any) =>
    updateOrderStatus(order._id || order.orderId, 'REFUNDED');

  const confirmPayment = async (order: any) => {
    const orderId = order._id || order.orderId;
    try {
      await handleConfirmPayment(orderId);
      patchOrderEverywhere(orderId, { paymentStatus: 'PAID' });
    } catch {
      // handleConfirmPayment already surfaced a toast
    }
  };

  const bulkAcceptOrders = async (orderIds: string[]) => {
    const { updatedIds } = await handleBulkUpdateOrderStatus(orderIds, 'CONFIRMED');
    updatedIds.forEach((id) => patchOrderEverywhere(id, { orderStatus: 'CONFIRMED' }));
    return updatedIds;
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    await updateOrderStatus(cancelTarget._id || cancelTarget.orderId, 'CANCELLED');
    setCancelling(false);
    setCancelTarget(null);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    setDeletingProduct(true);
    await handleDeleteProduct(deleteProductTarget._id);
    setDeletingProduct(false);
    setDeleteProductTarget(null);
  };

  const handleSelectProductImage = async (file: File) => {
    setNewProductImagePreview(URL.createObjectURL(file));
    setUploadingProductImage(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await menuService.uploadImage(dataUrl);
      setNewProductImageUrl(res.data.imageUrl);
    } catch (err: any) {
      toast.error(err.message || 'Could not upload image');
      setNewProductImageUrl('');
      setNewProductImagePreview('');
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await menuService.createCategory(newCategoryName.trim());
      setNewProductCategoryId(res.data._id);
      setNewCategoryName('');
      setShowAddCategory(false);
      await fetchDashboardData();
      toast.success('Category added!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setNewProductName('');
    setNewProductCategoryId('');
    setNewProductPricePaise(24900);
    setNewProductDescription('');
    setNewProductIsVeg(true);
    setNewProductImageUrl('');
    setNewProductImagePreview('');
  };

  const handleOpenAddProduct = () => {
    resetProductForm();
    setShowAddProductModal(true);
  };

  const handleOpenEditProduct = (product: any) => {
    setEditingProductId(product._id);
    setNewProductName(product.name || '');
    setNewProductCategoryId(
      typeof product.categoryId === 'string' ? product.categoryId : product.categoryId?._id || '',
    );
    setNewProductPricePaise(product.pricePaise || 0);
    setNewProductDescription(product.description || '');
    setNewProductIsVeg(product.isVeg !== false);
    setNewProductImageUrl(product.imageUrl || '');
    setNewProductImagePreview(product.imageUrl || '');
    setShowAddProductModal(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: newProductName,
      categoryId: newProductCategoryId || categories[0]?._id,
      pricePaise: Number(newProductPricePaise),
      description: newProductDescription,
      isVeg: newProductIsVeg,
      // No photo stays no photo — the customer menu shows a neutral tile, never another dish's picture.
      imageUrl: newProductImageUrl || '',
    };
    try {
      if (editingProductId) {
        await menuService.updateProduct(editingProductId, payload);
        toast.success('Item updated!');
      } else {
        await menuService.createProduct(payload);
        toast.success('Product added to menu!');
      }
      setShowAddProductModal(false);
      resetProductForm();
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tablesService.create(newTableNumber, Number(newTableCapacity));
      setShowAddTableModal(false);
      setNewTableNumber('');
      fetchDashboardData();
      toast.success('Table & QR code created!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryService.create({
        name: newInvName,
        unit: newInvUnit,
        currentStock: Number(newInvStock),
        minimumStockLevel: Number(newInvMinStock),
        costPerUnitPaise: Number(newInvCostPaise),
      });
      setShowAddInventoryModal(false);
      setNewInvName('');
      fetchDashboardData();
      toast.success('Ingredient added to inventory!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeOrders = orders.filter(
    (o) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.orderStatus),
  );
  const lowStockCount = inventoryItems.filter((i) => i.status !== 'IN_STOCK').length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;

  const publicMenuUrl = `${window.location.origin}/c/${business?.slug || 'artisan-cafe'}`;
  const copyMenuUrl = () => {
    navigator.clipboard.writeText(publicMenuUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('Menu link copied!');
  };

  return (
    <div className="dashboard-compact-type min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-orange-500 selection:text-white pb-12">
      <DashboardHeader
        user={headerUser}
        business={business}
        tabs={tabs}
        activeOrdersCount={activeOrders.length}
        lowStockCount={lowStockCount}
        refundsNeededCount={refundsState.insights?.needsRefundCount}
        activeTab={visibleTab}
        onChangeTab={setActiveTab}
        copiedUrl={copiedUrl}
        onCopyMenuUrl={copyMenuUrl}
        loading={loading}
        onRefresh={fetchDashboardData}
        onAddItem={isStaff ? undefined : handleOpenAddProduct}
        onOpenProfile={() => setActiveTab('profile')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-7 sm:py-7 space-y-7">
        {/* Sales/occupancy numbers are the owner's business, not the kitchen's. */}
        {!isStaff && (
          <KpiStatsGrid
            activeOrdersCount={activeOrders.length}
            occupiedTables={occupiedTables}
            totalTables={tables.length}
            lowStockCount={lowStockCount}
            metrics={analytics?.metrics ?? null}
          />
        )}

        {visibleTab === 'kds' && (
          <KitchenKdsBoard
            orders={orders}
            newlyArrivedOrderId={newlyArrivedOrderId}
            onViewAllOrders={() => setActiveTab('orders')}
            onUpdateStatus={updateOrderStatus}
            onCancel={setCancelTarget}
            onViewBill={handleOpenEBillModal}
            onConfirmPayment={confirmPayment}
            onBulkAccept={bulkAcceptOrders}
          />
        )}

        {visibleTab === 'orders' && (
          <OrderHistoryPanel
            business={business}
            orderHistory={orderHistoryState.orderHistory}
            todaySalesPaise={isStaff ? null : (analytics?.metrics?.todaySalesPaise ?? 0)}
            loadingHistory={orderHistoryState.loadingHistory}
            pagination={orderHistoryState.pagination}
            onPageChange={(page) => orderHistoryState.setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(limit) =>
              orderHistoryState.setPagination((prev) => ({ ...prev, limit, page: 1 }))
            }
            filters={orderHistoryState}
            onRefresh={orderHistoryState.fetchOrderHistory}
            onOpenDrawer={handleOpenOrderDrawer}
            onOpenBill={handleOpenEBillModal}
            onCancel={setCancelTarget}
            onMarkRefunded={isStaff ? undefined : handleMarkRefunded}
            onConfirmPayment={confirmPayment}
          />
        )}

        {visibleTab === 'menu' && (
          <DigitalMenuPanel
            products={products}
            categories={categories}
            onAddItem={handleOpenAddProduct}
            onEditItem={handleOpenEditProduct}
            onRemoveItem={handleRemoveProduct}
            onRestoreItem={handleRestoreProduct}
            onDeleteItem={setDeleteProductTarget}
          />
        )}

        {visibleTab === 'tables' && (
          <TablesQrPanel
            tables={tables}
            business={business}
            tablesEnabled={business?.tablesEnabled ?? true}
            savingTablesEnabled={savingTablesEnabled}
            onToggleTablesEnabled={handleToggleTablesEnabled}
            onAddTable={() => setShowAddTableModal(true)}
            onToggleTableActive={handleToggleTableActive}
            onDeleteTable={handleDeleteTable}
            onMarkTableEmpty={handleMarkTableEmpty}
            menuUrl={publicMenuUrl}
            masterQrEnabled={business?.masterQrEnabled !== false}
            savingMasterQr={savingMasterQr}
            onToggleMasterQr={handleToggleMasterQr}
          />
        )}

        {INVENTORY_ENABLED && visibleTab === 'inventory' && (
          <InventoryPanel
            inventoryItems={inventoryItems}
            onAddIngredient={() => setShowAddInventoryModal(true)}
          />
        )}

        {visibleTab === 'analytics' && <AnalyticsPanel analytics={analytics} />}

        {visibleTab === 'ledger' && (
          <FinancialLedgerPanel
            business={business}
            remittanceSummary={remittanceSummary}
            loadingRemittance={loadingRemittance}
            markingPaid={markingPaid}
            onMarkPaid={handleMarkRemittancePaid}
          />
        )}

        {visibleTab === 'refunds' && (
          <RefundsPanel
            orders={refundsState.orders}
            loading={refundsState.loading}
            insights={refundsState.insights}
            pagination={refundsState.pagination}
            onPageChange={(page) => refundsState.setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(limit) =>
              refundsState.setPagination((prev) => ({ ...prev, limit, page: 1 }))
            }
            searchQuery={refundsState.searchQuery}
            onSearchChange={refundsState.setSearchQuery}
            paymentStatusFilter={refundsState.paymentStatusFilter}
            onPaymentStatusFilterChange={refundsState.setPaymentStatusFilter}
            onRefresh={refundsState.refresh}
            onViewHistory={setHistoryOrder}
            onMarkRefunded={handleMarkRefunded}
          />
        )}

        {visibleTab === 'settings' && (
          <SettingsPanel
            business={business}
            subscription={analytics?.subscription ?? null}
            upiVpaInput={upiVpaInput}
            setUpiVpaInput={setUpiVpaInput}
            savingUpiVpa={savingUpiVpa}
            onSaveUpiVpa={() => handleSaveUpiVpa(upiVpaInput.trim())}
            savingTaxRate={savingTaxRate}
            onSaveTaxRate={handleSaveTaxRate}
            publicMenuUrl={publicMenuUrl}
            copiedUrl={copiedUrl}
            onCopyMenuUrl={copyMenuUrl}
            subscriptionStatus={subscriptionStatus}
            subscriptionPlans={subscriptionPlans}
            loadingSubscription={loadingSubscription}
            requestingPlanId={requestingPlanId}
            markingUpgradePaid={markingUpgradePaid}
            cancellingUpgrade={cancellingUpgrade}
            onRequestUpgrade={handleRequestUpgrade}
            onMarkUpgradePaid={handleMarkUpgradePaid}
            onCancelUpgrade={handleCancelUpgrade}
            checkout={checkoutState}
          />
        )}

        {visibleTab === 'staff' && <StaffPanel staffState={staffState} />}

        {visibleTab === 'profile' && <ProfilePanel account={account} />}
      </main>

      <OrderDetailsDrawer
        order={selectedOrderForDrawer}
        orderDetails={selectedOrderDetails}
        onClose={() => setSelectedOrderForDrawer(null)}
        onViewBill={handleOpenEBillModal}
        onCancel={setCancelTarget}
        onMarkRefunded={isStaff ? undefined : handleMarkRefunded}
        onConfirmPayment={confirmPayment}
      />

      <RefundHistoryModal order={historyOrder} onClose={() => setHistoryOrder(null)} />

      <CancelOrderModal
        order={cancelTarget}
        cancelling={cancelling}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelOrder}
      />

      <DeleteProductModal
        product={deleteProductTarget}
        deleting={deletingProduct}
        onClose={() => setDeleteProductTarget(null)}
        onConfirm={confirmDeleteProduct}
      />

      <EBillModal bill={selectedOrderForBill} onClose={() => setSelectedOrderForBill(null)} />

      <AddProductModal
        open={showAddProductModal}
        isEditing={!!editingProductId}
        onClose={() => setShowAddProductModal(false)}
        categories={categories}
        name={newProductName}
        setName={setNewProductName}
        categoryId={newProductCategoryId}
        setCategoryId={setNewProductCategoryId}
        pricePaise={newProductPricePaise}
        setPricePaise={setNewProductPricePaise}
        description={newProductDescription}
        setDescription={setNewProductDescription}
        isVeg={newProductIsVeg}
        setIsVeg={setNewProductIsVeg}
        onSubmit={handleSubmitProduct}
        showAddCategory={showAddCategory}
        setShowAddCategory={setShowAddCategory}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        creatingCategory={creatingCategory}
        onCreateCategory={handleCreateCategory}
        imagePreviewUrl={newProductImagePreview}
        uploadingImage={uploadingProductImage}
        onSelectImage={handleSelectProductImage}
      />

      <AddTableModal
        open={showAddTableModal}
        onClose={() => setShowAddTableModal(false)}
        tableNumber={newTableNumber}
        setTableNumber={setNewTableNumber}
        capacity={newTableCapacity}
        setCapacity={setNewTableCapacity}
        onSubmit={handleCreateTable}
      />

      <AddInventoryModal
        open={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        name={newInvName}
        setName={setNewInvName}
        unit={newInvUnit}
        setUnit={setNewInvUnit}
        stock={newInvStock}
        setStock={setNewInvStock}
        minStock={newInvMinStock}
        setMinStock={setNewInvMinStock}
        costPaise={newInvCostPaise}
        setCostPaise={setNewInvCostPaise}
        onSubmit={handleCreateInventory}
      />

      {SHOW_OWNER_SUPPORT_WIDGET && <SupportWidget mode="BUSINESS_OWNER" />}
    </div>
  );
};

export default OwnerDashboard;
