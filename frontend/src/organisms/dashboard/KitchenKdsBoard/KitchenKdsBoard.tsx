import React, { useRef, useState } from 'react';
import { ChefHat, FileText, Maximize2, Sparkles } from 'lucide-react';
import { BulkMoveOrdersModal } from '@/organisms/dashboard/BulkMoveOrdersModal';
import { NEXT_STATUS } from '@/constants/orderStatus';
import { PanelHeader } from '@/molecules/PanelHeader';
import { KitchenKdsBoardDesktop } from './KitchenKdsBoardDesktop';
import { KitchenKdsBoardMobile } from './KitchenKdsBoardMobile';
import { RecentOrdersList } from './RecentOrdersList';
import { KitchenModeView } from './KitchenModeView';
import { readKitchenMode, writeKitchenMode } from './kitchenMode';
import { useClickGuard } from './useClickGuard';
import { KdsBoardViewProps, KdsStatus, kdsColumnOrders, orderKey } from './types';
import { useNow } from '@/hooks/useNow';
import { KDS_CLOCK_MS } from '@/constants/kitchen';

interface KitchenKdsBoardProps {
  orders: any[];
  newlyArrivedOrderId: string | null;
  /** Omitted for staff, who have no All Orders tab — the link is hidden then. */
  onViewAllOrders?: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onCancel: (order: any) => void;
  onViewBill: (orderId: string) => void;
  onConfirmPayment: (order: any) => void;
  /** Shown in Kitchen mode's header. */
  businessName?: string;
  /** Whether Kitchen mode is on until the user chooses otherwise: kitchen staff want it, owners usually don't. */
  defaultKitchenMode?: boolean;
  /** Moves every order in `orderIds` to `status` at once; resolves with the ids that actually succeeded. */
  onBulkMove: (orderIds: string[], status: string) => Promise<string[]>;
}

/** Live kitchen board. Owns the bulk-move selection and modal, and renders both the desktop
 * and mobile column views — CSS picks which one is visible at the `md` breakpoint, where the three columns start to fit side by side. */
export const KitchenKdsBoard = ({
  orders,
  newlyArrivedOrderId,
  onViewAllOrders,
  onUpdateStatus,
  onCancel,
  onViewBill,
  onConfirmPayment,
  onBulkMove,
  businessName,
  defaultKitchenMode = false,
}: KitchenKdsBoardProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // The column whose bulk move is being confirmed, or null when the modal is closed.
  const [bulkStatus, setBulkStatus] = useState<KdsStatus | null>(null);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const now = useNow(KDS_CLOCK_MS);
  const [kitchenMode, setKitchenModeState] = useState(() => readKitchenMode(defaultKitchenMode));
  const toggleRef = useRef<HTMLButtonElement>(null);
  // The board that appears when Kitchen mode closes must ignore a double-click on "Exit".
  const boardGuard = useClickGuard();
  const setKitchenMode = (on: boolean) => {
    boardGuard.arm();
    setKitchenModeState(on);
    writeKitchenMode(on);
  };

  const ordersIn = (status: KdsStatus) => kdsColumnOrders(orders, status);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (status: KdsStatus) => {
    const column = ordersIn(status);
    const allSelected = column.length > 0 && column.every((o) => selectedIds.has(orderKey(o)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      column.forEach((o) => (allSelected ? next.delete(orderKey(o)) : next.add(orderKey(o))));
      return next;
    });
  };

  const selectOldest = (status: KdsStatus, count: number) => {
    const oldest = ordersIn(status).slice(0, count).map(orderKey);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ordersIn(status).forEach((o) => next.delete(orderKey(o)));
      oldest.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = (status: KdsStatus) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ordersIn(status).forEach((o) => next.delete(orderKey(o)));
      return next;
    });
  };

  // Only orders still in the column count, so one that moved on (or was cancelled) while the
  // modal was open drops out of the batch instead of being sent again.
  const bulkOrders = bulkStatus
    ? ordersIn(bulkStatus).filter((o) => selectedIds.has(orderKey(o)))
    : [];

  const handleConfirmBulkMove = async () => {
    if (!bulkStatus) return;
    setSubmittingBulk(true);
    try {
      await onBulkMove(bulkOrders.map(orderKey), NEXT_STATUS[bulkStatus].status);
    } finally {
      setSubmittingBulk(false);
      clearSelection(bulkStatus);
      setBulkStatus(null);
    }
  };

  const viewProps: KdsBoardViewProps = {
    orders,
    now,
    newlyArrivedOrderId,
    selectedIds,
    onToggleSelected: toggleSelected,
    onToggleSelectAll: toggleSelectAll,
    onClearSelection: clearSelection,
    onSelectOldest: selectOldest,
    onOpenBulkMove: setBulkStatus,
    onUpdateStatus,
    onCancel,
    onViewBill,
    onConfirmPayment,
  };

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={ChefHat}
        title="Kitchen — Live Orders"
        subtitle="New orders show up here instantly. Move each one along as you cook, or select several to move at once."
        actions={
          <>
            {onViewAllOrders && (
              <button
                onClick={onViewAllOrders}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition-colors border border-slate-200 whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>View All Orders →</span>
              </button>
            )}

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setKitchenMode(true)}
              aria-pressed={kitchenMode}
              title="Fill the screen with the kitchen board"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kitchen mode</span>
            </button>

            <div className="px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-black items-center gap-1.5 hidden sm:flex">
              <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
              <span>Updating live</span>
            </div>
          </>
        }
      />

      {kitchenMode ? (
        // The board is on screen in the overlay below; don't render a second copy of every ticket.
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
          <p className="text-sm font-black text-slate-700">Kitchen mode is on.</p>
          <button
            type="button"
            onClick={() => setKitchenMode(false)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-black"
          >
            Show the board here
          </button>
        </div>
      ) : (
        <div className="space-y-6" onClickCapture={boardGuard.onClickCapture}>
          <div className="md:hidden">
            <KitchenKdsBoardMobile {...viewProps} />
          </div>
          <div className="hidden md:block">
            <KitchenKdsBoardDesktop {...viewProps} />
          </div>

          <RecentOrdersList
            orders={orders}
            onViewAllOrders={onViewAllOrders}
            onViewBill={onViewBill}
            onConfirmPayment={onConfirmPayment}
          />
        </div>
      )}

      {kitchenMode && (
        <KitchenModeView
          {...viewProps}
          businessName={businessName}
          onViewAllOrders={onViewAllOrders}
          onExit={() => {
            setKitchenMode(false);
            // Back on the board header's own button, once the overlay has unmounted.
            requestAnimationFrame(() => toggleRef.current?.focus());
          }}
        />
      )}

      {bulkStatus && (
        <BulkMoveOrdersModal
          fromStatus={bulkStatus}
          orders={bulkOrders}
          submitting={submittingBulk}
          onClose={() => setBulkStatus(null)}
          onConfirm={handleConfirmBulkMove}
        />
      )}
    </div>
  );
};

export default KitchenKdsBoard;
