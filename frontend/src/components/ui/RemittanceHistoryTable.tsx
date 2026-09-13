import React from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

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

export const RemittanceHistoryTable: React.FC<RemittanceHistoryTableProps> = ({ periods, onMarkPaid, onUnmarkPaid }) => {
  const showActions = !!(onMarkPaid || onUnmarkPaid);
  if (periods.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
        No closed billing periods yet — commission accrues here once a period ends.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-slate-400 border-b border-slate-200 uppercase text-[10px] font-extrabold tracking-wider">
          <tr>
            <th className="pb-2.5">Period</th>
            <th className="pb-2.5">Orders</th>
            <th className="pb-2.5">Gross</th>
            <th className="pb-2.5">Commission Owed</th>
            <th className="pb-2.5">Due</th>
            <th className="pb-2.5">Status</th>
            {showActions && <th className="pb-2.5 text-right">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {periods.map((p) => {
            const isOverdue = p.status === 'UNPAID' && new Date(p.dueDate) < new Date();
            return (
              <tr key={p._id}>
                <td className="py-3 font-semibold text-slate-700">
                  {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                </td>
                <td className="py-3">{p.ordersCount}</td>
                <td className="py-3">₹{Math.round(p.grossAmountPaise / 100).toLocaleString('en-IN')}</td>
                <td className="py-3 font-extrabold text-slate-900">
                  ₹{Math.round(p.commissionOwedPaise / 100).toLocaleString('en-IN')}
                </td>
                <td className="py-3">{formatDate(p.dueDate)}</td>
                <td className="py-3">
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
                        title={p.merchantReportedUtr ? `UTR: ${p.merchantReportedUtr}` : undefined}
                      >
                        Business says paid · verify
                      </span>
                    )}
                  </div>
                </td>
                {showActions && (
                  <td className="py-3 text-right">
                    {p.status === 'UNPAID' && onMarkPaid && (
                      <button
                        onClick={() => onMarkPaid(p)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Mark as Paid
                      </button>
                    )}
                    {p.status === 'PAID' && onUnmarkPaid && (
                      <button
                        onClick={() => onUnmarkPaid(p)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Unmark
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RemittanceHistoryTable;
