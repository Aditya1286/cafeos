import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Maximize2, StickyNote, Wallet, X } from 'lucide-react';
import { NEXT_STATUS } from '@/constants/orderStatus';
import { waitInfo, type WaitLevel } from '@/utils/kitchenOrders';
import { formatCurrency } from '@/utils/money';
import { WaitBadge } from '@/molecules/WaitBadge';
import { KdsStatus } from './types';
import { useClickGuard } from './useClickGuard';
import { useHasMoreBelow } from './useHasMoreBelow';

interface TicketCardProps extends KdsWallTicketProps {
  /** The tapped-open copy: natural height, every item visible, no scrolling. */
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

interface KdsWallTicketProps {
  order: any;
  status: KdsStatus;
  now: number;
  isNew: boolean;
  isSelected: boolean;
  onToggleSelected: () => void;
  onAdvance: () => void;
  /** Omitted once the order can no longer be cancelled (anything past New). */
  onCancel?: () => void;
  onViewBill: () => void;
  onConfirmPayment: () => void;
}

/** One height for every ticket (see the component comment). 21rem fits three two-line items, an
 * allergy note and the pinned footer; longer orders scroll inside the item list. */
const TICKET_HEIGHT = 'h-[21rem]';

// The left edge says how urgent a ticket is before any text is read.
const EDGE: Record<WaitLevel | 'none', string> = {
  none: 'border-l-slate-300',
  ok: 'border-l-emerald-400',
  warn: 'border-l-amber-400',
  late: 'border-l-rose-500',
};

/**
 * A Kitchen mode ticket, made to be read from a distance and tapped with a thumb: what to cook is
 * the biggest thing on it, the wait is colour-coded, and the next step is one large button. Phone
 * numbers and prices stay off it; the bill, payment and cancel actions are small and out of the way.
 *
 * Every ticket is the SAME height, with fixed regions: header, order line, an always-visible note
 * (allergies must never scroll away), a scrolling item list, and a footer pinned to the bottom, so
 * a row of tickets lines up and the action buttons sit in the same place on every card. If an
 * order has more items than fit, the list scrolls, says so ("N more"), and the order line always
 * shows how many items there are. Plain elements (no layout animation) so fifty or a hundred of
 * these stay light.
 */
function TicketCard({
  order,
  status,
  now,
  isNew,
  isSelected,
  onToggleSelected,
  onAdvance,
  onCancel,
  onViewBill,
  onConfirmPayment,
  expanded = false,
  onExpand,
  onCollapse,
}: TicketCardProps) {
  const next = NEXT_STATUS[status];
  const unpaid = order.paymentStatus === 'UNPAID';
  const level = waitInfo(order.createdAt, now)?.level ?? 'none';
  const itemCount: number = order.items?.length ?? 0;
  const { ref: itemsRef, more } = useHasMoreBelow<HTMLUListElement>([order.items, order.notes]);

  return (
    <article
      data-testid="kds-wall-ticket"
      data-wait-level={level}
      aria-label={`Order ${order.orderId || order.orderNumber}, ${order.tableName || 'counter'}`}
      className={`bg-white rounded-2xl border border-l-[6px] shadow-sm p-3 flex flex-col gap-2 ${expanded ? 'max-h-[90vh] shadow-2xl' : TICKET_HEIGHT} ${EDGE[level]} ${
        isSelected
          ? 'border-blue-400 ring-4 ring-blue-100'
          : isNew
            ? 'border-brand-400 ring-4 ring-brand-100'
            : 'border-slate-200'
      }`}
    >
      <div className="shrink-0 flex items-center gap-2 h-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelected}
          aria-label={`Select order ${order.orderId || order.orderNumber}`}
          className="w-5 h-5 rounded accent-blue-600 shrink-0 cursor-pointer"
        />
        <span className="text-base font-black text-slate-900 shrink-0 max-w-[45%] truncate">
          {order.tableName || 'Counter'}
        </span>
        {order.customerName && (
          <span className="min-w-0 truncate text-xs font-bold text-slate-500">
            {order.customerName}
          </span>
        )}
        {isNew && (
          <span className="text-[10px] font-black text-white bg-brand-500 px-2 py-0.5 rounded-full uppercase animate-pulse shrink-0">
            New
          </span>
        )}
        <span className="ml-auto shrink-0">
          <WaitBadge createdAt={order.createdAt} now={now} size="lg" />
        </span>
        {expanded && (
          <button
            type="button"
            onClick={onCollapse}
            autoFocus
            aria-label="Close"
            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
        <span className="font-mono whitespace-nowrap">{order.orderId || order.orderNumber}</span>
        <span className="whitespace-nowrap flex items-center gap-1">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {!expanded && <Maximize2 className="w-3 h-3" aria-hidden="true" />}
        </span>
      </div>

      {order.notes && (
        <div className="shrink-0 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-sm font-bold text-amber-800 leading-snug">
          <StickyNote className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{order.notes}</span>
        </div>
      )}

      <div
        className={`relative flex-1 min-h-0 ${expanded ? '' : 'cursor-pointer'}`}
        {...(expanded
          ? {}
          : {
              role: 'button',
              tabIndex: 0,
              'aria-label': `Open order ${order.orderId || order.orderNumber} full size`,
              onClick: onExpand,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExpand?.();
                }
              },
            })}
      >
        <ul ref={itemsRef} className="h-full overflow-y-auto space-y-1.5 pr-1">
          {order.items?.map((it: any, i: number) => (
            <li key={i} className="text-[15px] leading-snug text-slate-900">
              <span className="font-black text-brand-600">{it.quantity}×</span>{' '}
              <span className="font-extrabold">{it.name}</span>
              {it.variantName && (
                <span className="ml-1 text-sm font-semibold text-slate-500">
                  ({it.variantName})
                </span>
              )}
              {it.addons?.length > 0 && (
                <div className="text-sm font-semibold text-slate-600">
                  + {it.addons.map((a: any) => a.name).join(', ')}
                </div>
              )}
              {it.notes && (
                <div className="text-sm font-semibold italic text-amber-700">“{it.notes}”</div>
              )}
            </li>
          ))}
        </ul>
        {more && !expanded && (
          <span
            data-testid="kds-more-items"
            className="pointer-events-none absolute bottom-0 right-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black shadow"
          >
            More items ↓
          </span>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1.5 h-9">
        {unpaid ? (
          <button
            type="button"
            onClick={onConfirmPayment}
            title={order.customerMarkedPaidAt ? 'Customer says paid: confirm' : 'Confirm payment'}
            className={`h-9 flex items-center gap-1 px-2 rounded-lg text-[11px] font-extrabold uppercase border ${
              order.customerMarkedPaidAt
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
            {order.customerMarkedPaidAt ? 'Says paid' : 'Unpaid'}
          </button>
        ) : (
          <span className="text-xs font-black text-emerald-600">
            {formatCurrency(order.totalAmountPaise)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onViewBill}
            title="View e-bill"
            aria-label="View e-bill"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <FileText className="w-4 h-4" />
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title="Cancel order"
              aria-label="Cancel order"
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {next && (
        <button
          type="button"
          onClick={onAdvance}
          className={`shrink-0 w-full h-11 rounded-xl text-sm font-extrabold active:scale-[0.98] transition-transform ${next.color}`}
        >
          {next.label}
        </button>
      )}
    </article>
  );
}

/** Tap a ticket's items to open it full size: every item visible, same actions. For the order that
 * is too long for the fixed-height card. A short guard after opening swallows a double-tap's second
 * click, which would otherwise land on this ticket's buttons. */
function ExpandedTicket(props: KdsWallTicketProps & { onClose: () => void }) {
  const { onClose, ...ticket } = props;
  const guard = useClickGuard(500, true);
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  // Esc closes just this view: capture phase, so Kitchen mode's own Esc handler never sees it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    const back = returnFocus.current;
    return () => {
      document.removeEventListener('keydown', onKey, true);
      back?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${ticket.order.orderId || ticket.order.orderNumber}`}
      onClickCapture={guard.onClickCapture}
      onClick={onClose}
      className="fixed inset-0 z-[46] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <TicketCard {...ticket} expanded onCollapse={onClose} />
      </div>
    </div>,
    document.body,
  );
}

export const KdsWallTicket = React.memo(function KdsWallTicket(props: KdsWallTicketProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TicketCard {...props} onExpand={() => setOpen(true)} />
      {open && <ExpandedTicket {...props} onClose={() => setOpen(false)} />}
    </>
  );
});

export default KdsWallTicket;
