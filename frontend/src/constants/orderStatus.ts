export const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    borderAccent: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
  }
> = {
  PLACED: {
    label: 'New Order',
    color: 'text-brand-700',
    borderAccent: 'border-t-brand-500',
    badgeBg: 'bg-brand-50',
    badgeText: 'text-brand-700 border-brand-200',
    dot: 'bg-brand-500',
  },
  PREPARING: {
    label: 'Preparing',
    color: 'text-amber-700',
    borderAccent: 'border-t-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  READY: {
    label: 'Ready to Serve',
    color: 'text-emerald-700',
    borderAccent: 'border-t-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-slate-500',
    borderAccent: 'border-t-slate-400',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-rose-700',
    borderAccent: 'border-t-rose-500',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'text-slate-600',
    borderAccent: 'border-t-slate-400',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export const NEXT_STATUS: Record<string, { label: string; status: string; color: string }> = {
  PLACED: {
    label: 'Start Preparing 👨‍🍳',
    status: 'PREPARING',
    color:
      'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-md shadow-brand-500/20',
  },
  PREPARING: {
    label: 'Mark Ready 🔔',
    status: 'READY',
    color:
      'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-md shadow-brand-500/20',
  },
  READY: {
    label: 'Complete Order 🎉',
    status: 'COMPLETED',
    color: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20',
  },
};

// The kitchen flow: New -> Preparing -> Ready (then Complete, which takes the order off the board).
export const KDS_COLUMN_STATUSES = ['PLACED', 'PREPARING', 'READY'] as const;

// Wording for moving a whole column forward at once (the board's bulk bar and BulkMoveOrdersModal).
// The target status is NEXT_STATUS[column].status, so it can't drift from the single-order button.
export const BULK_MOVE: Record<string, { verb: string; button: string; progress: string }> = {
  PLACED: { verb: 'Start preparing', button: 'Start preparing selected', progress: 'Starting…' },
  PREPARING: { verb: 'Mark ready', button: 'Mark selected ready', progress: 'Updating…' },
  READY: { verb: 'Complete', button: 'Complete selected', progress: 'Completing…' },
};

// Only a new order can be cancelled — once it's accepted it's going to be made. The backend
// enforces the same rule (orderController's applyOrderStatusChange).
export const isOrderCancellable = (status: string) => status === 'PLACED';
