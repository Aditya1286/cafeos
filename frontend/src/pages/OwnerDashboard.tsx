import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { toast } from '../utils/toast';

import { useOwnerDashboardData } from '../hooks/useOwnerDashboardData';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { useRemittance } from '../hooks/useRemittance';

import { DashboardHeader, DashboardTab } from '../components/organisms/dashboard/DashboardHeader';
import { KpiStatsGrid } from '../components/organisms/dashboard/KpiStatsGrid';
import { KitchenKdsBoard } from '../components/organisms/dashboard/KitchenKdsBoard';
import { OrderHistoryPanel } from '../components/organisms/dashboard/OrderHistoryPanel';
import { DigitalMenuPanel } from '../components/organisms/dashboard/DigitalMenuPanel';
import { TablesQrPanel } from '../components/organisms/dashboard/TablesQrPanel';
import { InventoryPanel } from '../components/organisms/dashboard/InventoryPanel';
import { AnalyticsPanel } from '../components/organisms/dashboard/AnalyticsPanel';
import { FinancialLedgerPanel } from '../components/organisms/dashboard/FinancialLedgerPanel';
import { SettingsPanel } from '../components/organisms/dashboard/SettingsPanel';
import { OrderDetailsDrawer } from '../components/organisms/dashboard/OrderDetailsDrawer';
import { CancelOrderModal } from '../components/organisms/dashboard/CancelOrderModal';
import { EBillModal } from '../components/organisms/dashboard/EBillModal';
import { AddProductModal } from '../components/organisms/dashboard/AddProductModal';
import { AddTableModal } from '../components/organisms/dashboard/AddTableModal';
import { AddInventoryModal } from '../components/organisms/dashboard/AddInventoryModal';

export const OwnerDashboard = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('kds');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const orderHistoryState = useOrderHistory(activeTab === 'orders');

  const dashboard = useOwnerDashboardData({
    onOrderNew: (newOrder) => orderHistoryState.prependOrder(newOrder),
    onOrderUpdated: (updated) => orderHistoryState.patchOrder(updated.orderId, { orderStatus: updated.orderStatus }),
    onCustomerMarkedPaid: (updated) => orderHistoryState.patchOrder(updated.orderId, { customerMarkedPaidAt: updated.customerMarkedPaidAt }),
  });
  const {
    orders, categories, products, tables, inventoryItems, analytics, business, loading,
    newlyArrivedOrderId, fetchDashboardData, handleUpdateOrderStatus,
    savingUpiVpa, handleSaveUpiVpa, savingTablesEnabled, handleToggleTablesEnabled,
  } = dashboard;
  const { remittanceSummary, loadingRemittance, markingPaid, handleMarkRemittancePaid } = useRemittance(activeTab);

  // Drawer & Bill Modal states
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Add-entity modal open flags
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);

  // Add Product form
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
      const res = await apiRequest(`/orders/${order.orderId || order._id}`);
      if (res.success) setSelectedOrderDetails(res.data);
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
  };

  const handleOpenEBillModal = async (orderId: string) => {
    try {
      const res = await apiRequest(`/orders/${orderId}/bill`);
      if (res.success) setSelectedOrderForBill(res.data);
    } catch (err) {
      console.error('Failed to load bill data:', err);
      toast.error('Could not load bill details.');
    }
  };

  const patchOrderEverywhere = (orderId: string, patch: Record<string, any>) => {
    orderHistoryState.patchOrder(orderId, patch);
    if (selectedOrderForDrawer && (selectedOrderForDrawer._id === orderId || selectedOrderForDrawer.orderId === orderId)) {
      setSelectedOrderForDrawer((prev: any) => ({ ...prev, ...patch }));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await handleUpdateOrderStatus(orderId, status);
      patchOrderEverywhere(orderId, { orderStatus: status });
    } catch {
      // handleUpdateOrderStatus already surfaced a toast
    }
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    await updateOrderStatus(cancelTarget._id || cancelTarget.orderId, 'CANCELLED');
    setCancelling(false);
    setCancelTarget(null);
  };

  const handleSelectProductImage = async (file: File) => {
    setNewProductImagePreview(URL.createObjectURL(file));
    setUploadingProductImage(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });
      const res = await apiRequest('/menu/upload-image', 'POST', { image: dataUrl });
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
      const res = await apiRequest('/menu/categories', 'POST', { name: newCategoryName.trim() });
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/menu/products', 'POST', {
        name: newProductName,
        categoryId: newProductCategoryId || categories[0]?._id,
        pricePaise: Number(newProductPricePaise),
        description: newProductDescription,
        isVeg: newProductIsVeg,
        imageUrl: newProductImageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'
      });
      setShowAddProductModal(false);
      setNewProductName(''); setNewProductDescription('');
      setNewProductImageUrl(''); setNewProductImagePreview('');
      fetchDashboardData();
      toast.success('Product added to menu!');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/tables', 'POST', { tableNumber: newTableNumber, capacity: Number(newTableCapacity) });
      setShowAddTableModal(false);
      setNewTableNumber('');
      fetchDashboardData();
      toast.success('Table & QR code created!');
    } catch (err: any) { toast.error(err.message); }
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
      toast.success('Ingredient added to inventory!');
    } catch (err: any) { toast.error(err.message); }
  };

  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.orderStatus));
  const lowStockCount = inventoryItems.filter(i => i.status !== 'IN_STOCK').length;
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;

  const publicMenuUrl = `${window.location.origin}/c/${business?.slug || 'artisan-cafe'}`;
  const copyMenuUrl = () => {
    navigator.clipboard.writeText(publicMenuUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('Public QR menu URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-orange-500 selection:text-white pb-12">
      <DashboardHeader
        user={user}
        business={business}
        activeOrdersCount={activeOrders.length}
        lowStockCount={lowStockCount}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        copiedUrl={copiedUrl}
        onCopyMenuUrl={copyMenuUrl}
        loading={loading}
        onRefresh={fetchDashboardData}
        onAddItem={() => setShowAddProductModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        <KpiStatsGrid
          activeOrdersCount={activeOrders.length}
          occupiedTables={occupiedTables}
          totalTables={tables.length}
          lowStockCount={lowStockCount}
          metrics={analytics?.metrics ?? null}
        />

        {activeTab === 'kds' && (
          <KitchenKdsBoard
            orders={orders}
            newlyArrivedOrderId={newlyArrivedOrderId}
            onViewAllOrders={() => setActiveTab('orders')}
            onUpdateStatus={updateOrderStatus}
            onCancel={setCancelTarget}
            onViewBill={handleOpenEBillModal}
          />
        )}

        {activeTab === 'orders' && (
          <OrderHistoryPanel
            business={business}
            orderHistory={orderHistoryState.orderHistory}
            todaySalesPaise={analytics?.metrics?.todaySalesPaise ?? 0}
            loadingHistory={orderHistoryState.loadingHistory}
            pagination={orderHistoryState.pagination}
            onPageChange={(page) => orderHistoryState.setPagination(prev => ({ ...prev, page }))}
            filters={orderHistoryState}
            onRefresh={orderHistoryState.fetchOrderHistory}
            onOpenDrawer={handleOpenOrderDrawer}
            onOpenBill={handleOpenEBillModal}
            onCancel={setCancelTarget}
          />
        )}

        {activeTab === 'menu' && (
          <DigitalMenuPanel products={products} onAddItem={() => setShowAddProductModal(true)} />
        )}

        {activeTab === 'tables' && (
          <TablesQrPanel
            tables={tables}
            business={business}
            tablesEnabled={business?.tablesEnabled ?? true}
            savingTablesEnabled={savingTablesEnabled}
            onToggleTablesEnabled={handleToggleTablesEnabled}
            onAddTable={() => setShowAddTableModal(true)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPanel inventoryItems={inventoryItems} onAddIngredient={() => setShowAddInventoryModal(true)} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPanel dailySales={analytics?.dailySales ?? []} />
        )}

        {activeTab === 'ledger' && (
          <FinancialLedgerPanel
            business={business}
            remittanceSummary={remittanceSummary}
            loadingRemittance={loadingRemittance}
            markingPaid={markingPaid}
            onMarkPaid={handleMarkRemittancePaid}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            business={business}
            subscription={analytics?.subscription ?? null}
            upiVpaInput={upiVpaInput}
            setUpiVpaInput={setUpiVpaInput}
            savingUpiVpa={savingUpiVpa}
            onSaveUpiVpa={() => handleSaveUpiVpa(upiVpaInput.trim())}
            publicMenuUrl={publicMenuUrl}
            copiedUrl={copiedUrl}
            onCopyMenuUrl={copyMenuUrl}
          />
        )}
      </main>

      <OrderDetailsDrawer
        order={selectedOrderForDrawer}
        orderDetails={selectedOrderDetails}
        onClose={() => setSelectedOrderForDrawer(null)}
        onViewBill={handleOpenEBillModal}
        onCancel={setCancelTarget}
      />

      <CancelOrderModal
        order={cancelTarget}
        cancelling={cancelling}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelOrder}
      />

      <EBillModal bill={selectedOrderForBill} onClose={() => setSelectedOrderForBill(null)} />

      <AddProductModal
        open={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        categories={categories}
        name={newProductName} setName={setNewProductName}
        categoryId={newProductCategoryId} setCategoryId={setNewProductCategoryId}
        pricePaise={newProductPricePaise} setPricePaise={setNewProductPricePaise}
        description={newProductDescription} setDescription={setNewProductDescription}
        isVeg={newProductIsVeg} setIsVeg={setNewProductIsVeg}
        onSubmit={handleCreateProduct}
        showAddCategory={showAddCategory} setShowAddCategory={setShowAddCategory}
        newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName}
        creatingCategory={creatingCategory}
        onCreateCategory={handleCreateCategory}
        imagePreviewUrl={newProductImagePreview}
        uploadingImage={uploadingProductImage}
        onSelectImage={handleSelectProductImage}
      />

      <AddTableModal
        open={showAddTableModal}
        onClose={() => setShowAddTableModal(false)}
        tableNumber={newTableNumber} setTableNumber={setNewTableNumber}
        capacity={newTableCapacity} setCapacity={setNewTableCapacity}
        onSubmit={handleCreateTable}
      />

      <AddInventoryModal
        open={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        name={newInvName} setName={setNewInvName}
        unit={newInvUnit} setUnit={setNewInvUnit}
        stock={newInvStock} setStock={setNewInvStock}
        minStock={newInvMinStock} setMinStock={setNewInvMinStock}
        costPaise={newInvCostPaise} setCostPaise={setNewInvCostPaise}
        onSubmit={handleCreateInventory}
      />
    </div>
  );
};

export default OwnerDashboard;
