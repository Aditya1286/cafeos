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
    color: 'text-purple-700',
    borderAccent: 'border-t-purple-500',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'text-blue-700',
    borderAccent: 'border-t-blue-500',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  PREPARING: {
    label: 'Cooking',
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
    color: 'text-violet-700',
    borderAccent: 'border-t-violet-500',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
};

export const NEXT_STATUS: Record<string, { label: string; status: string; color: string }> = {
  PLACED: {
    label: 'Accept Order',
    status: 'CONFIRMED',
    color:
      'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20',
  },
  CONFIRMED: {
    label: 'Start Cooking 👨‍🍳',
    status: 'PREPARING',
    color:
      'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20',
  },
  PREPARING: {
    label: 'Mark Ready 🔔',
    status: 'READY',
    color:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20',
  },
  READY: {
    label: 'Complete Order 🎉',
    status: 'COMPLETED',
    color: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20',
  },
};

export const KDS_COLUMN_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] as const;

export const isOrderCancellable = (status: string) =>
  !['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(status);
