export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'OWNER' 
  | 'MANAGER' 
  | 'RECEPTIONIST' 
  | 'STAFF' 
  | 'INVENTORY_MANAGER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  currencySymbol: string;
  taxRatePercentage: number;
  perOrderFeePaise: number;
  openingTime: string;
  closingTime: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  description: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  perOrderFeePaise: number;
  limits: {
    maxTables: number;
    maxMenuItems: number;
    maxStaff: number;
    inventoryEnabled: boolean;
    analyticsAdvanced: boolean;
  };
  isPopular?: boolean;
  status: 'ACTIVE' | 'DISABLED';
  subscriberCount?: number;
}

export interface Category {
  _id: string;
  businessId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isAvailable: boolean;
}

export interface ProductVariant {
  name: string;
  pricePaise: number;
}

export interface ProductAddon {
  name: string;
  pricePaise: number;
}

export interface Product {
  _id: string;
  businessId: string;
  categoryId: string | Category;
  name: string;
  description: string;
  pricePaise: number;
  imageUrl?: string;
  isAvailable: boolean;
  isVeg: boolean;
  preparationTimeMinutes: number;
  variants: ProductVariant[];
  addons: ProductAddon[];
}

export interface TableItem {
  _id: string;
  businessId: string;
  tableNumber: string;
  capacity: number;
  qrToken: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
}

export type OrderStatus = 
  | 'PLACED' 
  | 'CONFIRMED' 
  | 'PREPARING' 
  | 'READY' 
  | 'SERVED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  variantName?: string;
  addons?: { name: string; pricePaise: number }[];
  itemTotalPaise: number;
  notes?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  businessId: string;
  tableId: string;
  tableName: string;
  customerName: string;
  customerPhone: string;
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  taxPaise: number;
  platformFeePaise: number;
  totalAmountPaise: number;
  businessEarningsPaise: number;
  orderStatus: OrderStatus;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paymentMethod: 'ONLINE' | 'CASH';
  createdAt: string;
}

export interface FinancialLedger {
  _id: string;
  transactionId: string;
  businessId: string;
  type: 'ORDER_PAYMENT' | 'PLATFORM_FEE' | 'BUSINESS_SETTLEMENT' | 'SUBSCRIPTION_FEE' | 'REFUND';
  amountPaise: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  paymentGatewayRef?: string;
  metadata?: any;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  businessId: string;
  name: string;
  unit: 'KG' | 'GRAM' | 'LITER' | 'ML' | 'PIECE' | 'PACKET';
  currentStock: number;
  minimumStockLevel: number;
  costPerUnitPaise: number;
  supplierName?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface DashboardMetrics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalSalesPaise: number;
  totalEarningsPaise: number;
  totalTables: number;
  occupiedTables: number;
  lowStockItems: number;
  totalMenuItems: number;
  todaySalesPaise: number;
  todayOrdersCount: number;
  weekSalesPaise: number;
  previousWeekSalesPaise: number;
  /** null when there is no prior-week baseline to compare against */
  salesTrendPercentage: number | null;
}

export interface DailySalesPoint {
  _id: string; // "YYYY-MM-DD"
  orders: number;
  salesPaise: number;
}

export interface TopProduct {
  _id: string; // product name
  totalQuantity: number;
  totalRevenuePaise: number;
}

export interface RepeatCustomerStats {
  totalCustomers: number;
  repeatCustomers: number;
  oneTimeCustomers: number;
  repeatCustomerPercentage: number | null;
  totalRevenuePaise: number;
  repeatRevenuePaise: number;
  repeatRevenuePercentage: number | null;
}

export interface ItemMarginRow {
  productId: string;
  name: string;
  pricePaise: number;
  ingredientCostPaise: number | null;
  marginPaise: number | null;
  marginPercentage: number | null;
  hasRecipe: boolean;
}

export interface ItemMarginsData {
  items: ItemMarginRow[];
  productsWithoutRecipeCount: number;
}

export interface KitchenSpeedStats {
  avgAcceptSeconds: number | null;
  avgPrepSeconds: number | null;
  avgFulfillmentSeconds: number | null;
  sampleSize: number;
  windowDays: number;
}

export interface DashboardSubscriptionInfo {
  planName: string;
  planCode: string;
  limits: {
    maxTables: number;
    maxMenuItems: number;
    maxStaff: number;
    inventoryEnabled: boolean;
    analyticsAdvanced: boolean;
  };
  usage: { tables: number; menuItems: number };
}

export interface DashboardAnalytics {
  metrics: DashboardMetrics;
  dailySales: DailySalesPoint[];
  topProducts: TopProduct[];
  repeatCustomers: RepeatCustomerStats;
  itemMargins: ItemMarginsData;
  kitchenSpeed: KitchenSpeedStats;
  subscription: DashboardSubscriptionInfo | null;
}

export interface SuperAdminMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalUsers: number;
  totalOrders: number;
  paidOrders: number;
  totalGMVPaise: number;
  totalPlatformFeesPaise: number;
  totalSubscriptionRevenuePaise: number;
  totalPlatformRevenuePaise: number;
  avgOrderValuePaise: number;
  lowStockItemsCount: number;
  totalCustomers: number;
  repeatCustomers: number;
  /** null when there's no order history to compute a rate from */
  repeatCustomerPercentage: number | null;
}

export interface SuperAdminRecentOrder {
  _id: string;
  orderNumber: string;
  businessName: string;
  tableName: string;
  customerName: string;
  itemsCount: number;
  total: number; // whole rupees, not paise — set directly by the backend
  status: string;
  paymentMethod: string;
  createdAt: string;
}

export interface SuperAdminOverview {
  metrics: SuperAdminMetrics;
  recentOrders: SuperAdminRecentOrder[];
  plans: SubscriptionPlan[];
}

export interface AdminBusinessSummary extends Business {
  _id: string;
  commissionRatePercentage: number;
  lifetimeGMVPaise: number;
  totalCommissionOwedPaise: number;
  overdueAmountPaise: number;
  nextDueDate: string | null;
  currentPlan: { _id: string; name: string; code: string } | null;
  subscriptionStatus: string | null;
}

export interface RevenueTimeseriesPoint {
  time: string;
  revenue: number; // whole rupees
  fees: number; // whole rupees
}

export interface PaymentMethodBreakdownPoint {
  _id: string;
  count: number;
  amountPaise: number;
}

export interface CancellationStats {
  totalTerminalCount: number;
  cancelledCount: number;
  refundedCount: number;
  /** null when there are no terminal (completed/cancelled/refunded) orders yet in the range */
  rate: number | null;
}

export interface CancellationTimeseriesPoint {
  time: string;
  cancelled: number;
  refunded: number;
  total: number;
  rate: number | null;
}

export interface WorstBusinessByCancellation {
  businessId: string;
  name: string;
  slug: string;
  total: number;
  cancelled: number;
  refunded: number;
  rate: number;
}

export interface AdminAnalytics {
  revenueTimeseries: RevenueTimeseriesPoint[];
  paymentMethodBreakdown: PaymentMethodBreakdownPoint[];
  bestSellers: TopProduct[];
  peakHeatmap: { _id: number; orders: number }[];
  cancellationStats: CancellationStats;
  cancellationTimeseries: CancellationTimeseriesPoint[];
  worstBusinessesByCancellation: WorstBusinessByCancellation[];
}

export interface BusinessHeatmapCell {
  day: number; // 1 = Sunday ... 7 = Saturday ($dayOfWeek convention)
  hour: number; // 0-23
  revenuePaise: number;
  orders: number;
}

export interface BusinessHourlyHeatmap {
  business: { _id: string; name: string; slug: string };
  windowDays: number;
  cells: BusinessHeatmapCell[];
}

export interface AdminBusinessInsights {
  business: { _id: string; name: string; slug: string };
  repeatCustomers: RepeatCustomerStats;
  itemMargins: ItemMarginsData;
  kitchenSpeed: KitchenSpeedStats;
}

export interface TopBusinessByRevenue {
  _id: string;
  name: string;
  slug: string;
  revenuePaise: number;
  orders: number;
}

export interface SystemHealth {
  status: string;
  uptimeSeconds: number;
  memoryUsage: { heapUsedMB: number; heapTotalMB: number };
  database: string;
  timestamp: string;
}

export interface AdminRemittanceRequest {
  _id: string;
  businessId: { name: string; slug: string } | string;
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
  grossAmountPaise: number;
  commissionOwedPaise: number;
  dueDate: string;
  status: 'UNPAID' | 'PAID';
  paidAt?: string;
  markedPaidByUserId?: { name: string; email: string };
  merchantMarkedPaidAt?: string;
  merchantReportedUtr?: string;
}
