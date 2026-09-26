import { KDS_COLUMN_STATUSES } from '@/constants/orderStatus';

export type KdsStatus = (typeof KDS_COLUMN_STATUSES)[number];

export const orderKey = (order: any) => order._id || order.orderId;

/** What every status column needs from the parent board — the live orders, the bulk-accept
 * selection (owned by the parent so it survives switching between the mobile and desktop
 * views), and the per-order actions. */
export interface KdsBoardViewProps {
  orders: any[];
  newlyArrivedOrderId: string | null;
  selectedIds: Set<string>;
  allNewSelected: boolean;
  onToggleSelected: (id: string) => void;
  onToggleSelectAllNew: () => void;
  onClearSelection: () => void;
  onOpenBulkAccept: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onCancel: (order: any) => void;
  onViewBill: (orderId: string) => void;
  onConfirmPayment: (order: any) => void;
}
