import React from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import ResponsiveDataView from '@/molecules/ResponsiveDataView';

export interface RemittancePeriod {
  _id: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  ordersCount: number;
  grossAmountPaise: number;
  commissionOwedPaise: number;
  status: 'UNPAID' | 'PAID';
  paidAt?: string;
  paidAmountPaise?: number;
  merchantMarkedPaidAt?: string;
  merchantReportedUtr?: string;
}

interface RemittanceHistoryTableProps {
  periods: RemittancePeriod[];
  onMarkPaid?: (period: RemittancePeriod) => void;
  onUnmarkPaid?: (period: RemittancePeriod) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const StatusBadges = ({ p }: { p: RemittancePeriod }) => {
  const isOverdue = p.status === 'UNPAID' && new Date(p.dueDate) < new Date();
  return (
    <div className="flex flex-col gap-1 items-start">
      {p.status === 'PAID' ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      ) : isOverdue ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
          <Clock className="w-3 h-3" /> Unpaid
        </span>
      )}
      {p.status === 'UNPAID' && p.merchantMarkedPaidAt && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[9px] font-extrabold border border-orange-200 uppercase"
          title={p.merchantReportedUtr ? `UPI ref: ${p.merchantReportedUtr}` : undefined}
        >
          Business says paid · verify
        </span>
      )}
    </div>
  );
};

/** Every billing period, newest first — paged 10 at a time so a business with months of history
 * doesn't get one endless list. Shared by the owner's Fees & Payments tab (read-only) and the
 * super admin's finance drawer (with Mark as Paid / Unmark actions). */
export const RemittanceHistoryTable: React.FC<RemittanceHistoryTableProps> = ({
  periods,
  onMarkPaid,
  onUnmarkPaid,
}) => {
  const showActions = !!(onMarkPaid || onUnmarkPaid);

  const renderAction = (p: RemittancePeriod, fullWidth = false) => (
    <>
      {p.status === 'UNPAID' && onMarkPaid && (
        <button
          onClick={() => onMarkPaid(p)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors ${fullWidth ? 'w-full py-2' : ''}`}
        >
          Mark as Paid
        </button>
      )}
      {p.status === 'PAID' && onUnmarkPaid && (
        <button
          onClick={() => onUnmarkPaid(p)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors ${fullWidth ? 'w-full py-2' : ''}`}
        >
          Unmark
        </button>
      )}
    </>
  );

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <ResponsiveDataView
        data={periods}
        keyExtractor={(p) => p._id}
        breakpoint="md"
        pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        emptyState={
          <div className="p-6 text-center text-xs text-slate-400 font-medium">
            Nothing here yet — your fees show up once a billing period ends.
          </div>
        }
        columns={[
          {
            header: 'Period',
            render: (p) => (
              <span className="font-semibold text-slate-700 whitespace-nowrap">
                {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
              </span>
            ),
          },
          { header: 'Orders', render: (p) => p.ordersCount },
          { header: 'Sales', render: (p) => rupees(p.grossAmountPaise) },
          {
            header: 'Fee Owed',
            render: (p) => (
              <span className="font-extrabold text-slate-900">{rupees(p.commissionOwedPaise)}</span>
            ),
          },
          {
            header: 'Due',
            render: (p) => <span className="whitespace-nowrap">{formatDate(p.dueDate)}</span>,
          },
          { header: 'Status', render: (p) => <StatusBadges p={p} /> },
          ...(showActions
            ? [
                {
                  header: 'Action',
                  align: 'right' as const,
                  render: (p: RemittancePeriod) => renderAction(p),
                },
              ]
            : []),
        ]}
        renderCard={(p) => (
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">
                  {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {p.ordersCount} orders · {rupees(p.grossAmountPaise)} sales · due{' '}
                  {formatDate(p.dueDate)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-black text-slate-900">
                  {rupees(p.commissionOwedPaise)}
                </div>
                <div className="text-[10px] font-bold text-slate-400">fee</div>
              </div>
            </div>
            <StatusBadges p={p} />
            {showActions && renderAction(p, true)}
          </div>
        )}
      />
    </div>
  );
};

export default RemittanceHistoryTable;
