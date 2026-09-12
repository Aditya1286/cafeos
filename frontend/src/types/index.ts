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
  tenantId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Restaurant {
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
}

export interface Category {
  _id: string;
  tenantId: string;
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
  tenantId: string;
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
  tenantId: string;
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
  tenantId: string;
  tableId: string;
  tableName: string;
  customerName: string;
  customerPhone: string;
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  taxPaise: number;
  platformFeePaise: number;
  totalAmountPaise: number;
  restaurantEarningsPaise: number;
  orderStatus: OrderStatus;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paymentMethod: 'ONLINE' | 'CASH' | 'UPI';
  createdAt: string;
}

export interface FinancialLedger {
  _id: string;
  transactionId: string;
  tenantId: string;
  type: 'ORDER_PAYMENT' | 'PLATFORM_FEE' | 'RESTAURANT_SETTLEMENT' | 'SUBSCRIPTION_FEE' | 'REFUND';
  amountPaise: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  paymentGatewayRef?: string;
  metadata?: any;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  tenantId: string;
  name: string;
  unit: 'KG' | 'GRAM' | 'LITER' | 'ML' | 'PIECE' | 'PACKET';
  currentStock: number;
  minimumStockLevel: number;
  costPerUnitPaise: number;
  supplierName?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
