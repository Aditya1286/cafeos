import React, { useState } from 'react';
import { ChefHat, FileText, Sparkles } from 'lucide-react';
import { BulkAcceptOrdersModal } from '@/organisms/dashboard/BulkAcceptOrdersModal';
import { PanelHeader } from '@/molecules/PanelHeader';
import { KitchenKdsBoardDesktop } from './KitchenKdsBoardDesktop';
import { KitchenKdsBoardMobile } from './KitchenKdsBoardMobile';
import { RecentOrdersList } from './RecentOrdersList';
import { KdsBoardViewProps, orderKey } from './types';

interface KitchenKdsBoardProps {
  orders: any[];
  newlyArrivedOrderId: string | null;
  /** Omitted for staff, who have no All Orders tab — the link is hidden then. */
  onViewAllOrders?: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onCancel: (order: any) => void;
  onViewBill: (orderId: string) => void;
  onConfirmPayment: (order: any) => void;
  /** Accepts (PLACED -> CONFIRMED) every order in `orderIds` at once; resolves with the ids that actually succeeded. */
  onBulkAccept: (orderIds: string[]) => Promise<string[]>;
}

/** Live kitchen board. Owns the bulk-accept selection and modal, and renders both the desktop
 * and mobile column views — CSS picks which one is visible at the `sm` breakpoint. */
export const KitchenKdsBoard = ({
  orders,
  newlyArrivedOrderId,
  onViewAllOrders,
  onUpdateStatus,
  onCancel,
  onViewBill,
  onConfirmPayment,
  onBulkAccept,
}: KitchenKdsBoardProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const newOrders = orders.filter((o) => o.orderStatus === 'PLACED');
  const allNewSelected =
    newOrders.length > 0 && newOrders.every((o) => selectedIds.has(orderKey(o)));
  const selectedOrders = orders.filter((o) => selectedIds.has(orderKey(o)));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllNew = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allNewSelected) newOrders.forEach((o) => next.delete(orderKey(o)));
      else newOrders.forEach((o) => next.add(orderKey(o)));
      return next;
    });
  };

  const handleConfirmBulkAccept = async () => {
    setSubmittingBulk(true);
    try {
      await onBulkAccept(Array.from(selectedIds));
    } finally {
      setSubmittingBulk(false);
      setShowBulkModal(false);
      setSelectedIds(new Set());
    }
  };

  const viewProps: KdsBoardViewProps = {
    orders,
    newlyArrivedOrderId,
    selectedIds,
    allNewSelected,
    onToggleSelected: toggleSelected,
    onToggleSelectAllNew: toggleSelectAllNew,
    onClearSelection: () => setSelectedIds(new Set()),
    onOpenBulkAccept: () => setShowBulkModal(true),
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
        subtitle="New orders show up here instantly. Move each one along as you cook."
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

            <div className="px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black items-center gap-1.5 hidden sm:flex">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
              <span>Updating live</span>
            </div>
          </>
        }
      />

      <div className="sm:hidden">
        <KitchenKdsBoardMobile {...viewProps} />
      </div>
      <div className="hidden sm:block">
        <KitchenKdsBoardDesktop {...viewProps} />
      </div>

      <RecentOrdersList
        orders={orders}
        onViewAllOrders={onViewAllOrders}
        onViewBill={onViewBill}
        onConfirmPayment={onConfirmPayment}
      />

      {showBulkModal && (
        <BulkAcceptOrdersModal
          orders={selectedOrders}
          submitting={submittingBulk}
          onClose={() => setShowBulkModal(false)}
          onConfirm={handleConfirmBulkAccept}
        />
      )}
    </div>
  );
};

export default KitchenKdsBoard;
