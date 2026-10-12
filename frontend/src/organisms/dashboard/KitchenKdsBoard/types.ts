import { KDS_COLUMN_STATUSES } from '@/constants/orderStatus';
import { sortOldestFirst } from '@/utils/kitchenOrders';

export type KdsStatus = (typeof KDS_COLUMN_STATUSES)[number];

export const orderKey = (order: any) => order._id || order.orderId;

/** The orders in one status column, oldest first: the one that has waited longest is cooked next.
 * Every part of the board (columns, select-all, the bulk-move list) reads a column through this, so
 * they always agree on the order. */
export const kdsColumnOrders = (orders: any[], status: KdsStatus): any[] =>
  sortOldestFirst(orders.filter((o) => o.orderStatus === status));

/** What every status column needs from the parent board — the live orders, the bulk selection
 * (owned by the parent so it survives switching between the mobile and desktop views), and the
 * per-order actions. Selection is one set of order ids; a column only ever acts on the ids that
 * are in it. */
export interface KdsBoardViewProps {
  orders: any[];
  /** The board's shared clock (ms), for waiting times. */
  now: number;
  newlyArrivedOrderId: string | null;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onToggleSelectAll: (status: KdsStatus) => void;
  onClearSelection: (status: KdsStatus) => void;
  /** Selects the `count` oldest orders in a column (replacing that column's selection). */
  onSelectOldest: (status: KdsStatus, count: number) => void;
  onOpenBulkMove: (status: KdsStatus) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onCancel: (order: any) => void;
  onViewBill: (orderId: string) => void;
  onConfirmPayment: (order: any) => void;
}
