import React from 'react';
import { Wallet, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../../../utils/money';
import { AdminRemittanceRequest } from '../../../types';

interface RemittanceQueueTableProps {
  remittanceView: 'UNPAID' | 'PAID';
  onChangeView: (view: 'UNPAID' | 'PAID') => void;
  pendingCount: number;
  requests: AdminRemittanceRequest[];
  loading: boolean;
  onMarkPaid: (id: string) => void;
  onUnmarkPaid: (id: string) => void;
}

export const RemittanceQueueTable = ({ remittanceView, onChangeView, pendingCount, requests, loading, onMarkPaid, onUnmarkPaid }: RemittanceQueueTableProps) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-extrabold text-slate-900">Remittance Requests</h3>
        <p className="text-xs text-slate-500 font-medium">
          Commission owed across every business — verify and settle collections here
        </p>
      </div>
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold w-full sm:w-auto">
        <button
          onClick={() => onChangeView('UNPAID')}
          className={`px-4 py-2 rounded-xl transition-all ${remittanceView === 'UNPAID' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Pending {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => onChangeView('PAID')}
          className={`px-4 py-2 rounded-xl transition-all ${remittanceView === 'PAID' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Logs
        </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-semibold">Loading remittances…</div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-700">
            {remittanceView === 'UNPAID' ? 'Nothing outstanding' : 'No settled periods yet'}
          </h4>
          <p className="text-xs text-slate-400">
            {remittanceView === 'UNPAID'
              ? 'Every business is settled up — new requests will land here once a billing period closes.'
              : 'Once you mark a request as paid, it moves here as a permanent log.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Business</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Orders</th>
                <th className="px-5 py-3.5">Gross</th>
                <th className="px-5 py-3.5">Commission</th>
                <th className="px-5 py-3.5">{remittanceView === 'UNPAID' ? 'Due' : 'Paid'}</th>
                <th className="px-5 py-3.5">Claim</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {requests.map((r) => {
                const business = typeof r.businessId === 'string' ? null : r.businessId;
                const isOverdue = r.status === 'UNPAID' && new Date(r.dueDate) < new Date();
                return (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900">{business?.name || 'Unknown business'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">/c/{business?.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(r.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {' – '}
                      {new Date(r.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-4">{r.ordersCount}</td>
                    <td className="px-5 py-4">{formatCurrency(r.grossAmountPaise)}</td>
                    <td className="px-5 py-4 font-black text-slate-900">
                      {formatCurrency(r.commissionOwedPaise)}
                    </td>
                    <td className="px-5 py-4">
                      {remittanceView === 'UNPAID' ? (
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                          {new Date(r.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          {isOverdue && ' · Overdue'}
                        </span>
                      ) : (
                        <div>
                          <div className="text-slate-700">
                            {r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                          {r.markedPaidByUserId?.name && (
                            <div className="text-[10px] text-slate-400">by {r.markedPaidByUserId.name}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {r.merchantMarkedPaidAt ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-extrabold border border-orange-200"
                          title={r.merchantReportedUtr ? `UTR: ${r.merchantReportedUtr}` : 'No reference given'}
                        >
                          <AlertTriangle className="w-3 h-3" /> Claims paid
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {remittanceView === 'UNPAID' ? (
                        <button
                          onClick={() => onMarkPaid(r._id)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                        </button>
                      ) : (
                        <button
                          onClick={() => onUnmarkPaid(r._id)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Unmark
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

export default RemittanceQueueTable;
