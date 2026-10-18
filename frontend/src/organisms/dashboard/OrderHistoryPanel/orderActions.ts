import { Wallet, Undo2, X } from 'lucide-react';
import { isOrderCancellable } from '@/constants/orderStatus';
import { StatusBadgeTone } from '@/atoms/StatusBadge';

// What can be done to an order from the list, for the phone layout. Same rules as the desktop
// panel: confirm an unpaid payment, mark a paid-then-cancelled order refunded, cancel a live one.
export const PAYMENT_BADGE_TONE: Record<string, StatusBadgeTone> = {
  PAID: 'success',
  REFUNDED: 'neutral',
  FAILED: 'danger',
  UNPAID: 'warning',
};

export const ACTION_BUTTON_CLASS: Record<'amber' | 'brand' | 'rose', string> = {
  amber: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700',
  brand: 'bg-brand-50 hover:bg-brand-100 border-brand-200 text-brand-700',
  rose: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700',
};

/** A paid order that has been cancelled but not yet refunded. */
export const needsRefund = (o: any) => o.orderStatus === 'CANCELLED' && o.paymentStatus === 'PAID';

export interface OrderAction {
  key: string;
  label: string;
  icon: typeof Wallet;
  tone: 'amber' | 'brand' | 'rose';
  onClick: () => void;
}

interface ActionHandlers {
  onCancel: (order: any) => void;
  onMarkRefunded?: (order: any) => void;
  onConfirmPayment: (order: any) => void;
}

export const availableActions = (o: any, handlers: ActionHandlers): OrderAction[] => {
  const actions: OrderAction[] = [];
  if (o.paymentStatus === 'UNPAID' && o.orderStatus !== 'CANCELLED') {
    actions.push({
      key: 'confirm',
      label: o.customerMarkedPaidAt ? 'Confirm Payment (Customer says paid)' : 'Confirm Payment',
      icon: Wallet,
      tone: 'amber',
      onClick: () => handlers.onConfirmPayment(o),
    });
  }
  if (needsRefund(o) && handlers.onMarkRefunded) {
    const markRefunded = handlers.onMarkRefunded;
    actions.push({
      key: 'refund',
      label: 'Mark Refunded',
      icon: Undo2,
      tone: 'brand',
      onClick: () => markRefunded(o),
    });
  }
  if (isOrderCancellable(o.orderStatus)) {
    actions.push({
      key: 'cancel',
      label: 'Cancel Order',
      icon: X,
      tone: 'rose',
      onClick: () => handlers.onCancel(o),
    });
  }
  return actions;
};
