// The Super Admin dashboard's live order feed row. One shape for both the initial load
// (superAdminController's overview `recentOrders`) and the realtime `admin_order:new` event,
// so a pushed order renders exactly like a fetched one.
export interface AdminLiveOrder {
  _id: string;
  orderNumber: string;
  businessName: string;
  tableName?: string;
  customerName: string;
  itemsCount: number;
  total: number; // whole rupees, display-only
  status: string;
  paymentMethod: string;
  createdAt: Date;
}

export const toAdminLiveOrder = (order: any, businessName?: string): AdminLiveOrder => ({
  _id: order._id.toString(),
  orderNumber: order.orderNumber,
  businessName: businessName || 'Unknown Business',
  tableName: order.tableName,
  customerName: order.customerName,
  itemsCount: order.items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 1,
  total: Math.round((order.totalAmountPaise || 0) / 100),
  status: order.orderStatus,
  paymentMethod: order.paymentMethod,
  createdAt: order.createdAt
});
