import React, { useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../utils/money';
import { AdminSubscriptionRequest, SubscriptionRequestStatus } from '../../../types';

interface SubscriptionRequestsQueueProps {
  requestsView: SubscriptionRequestStatus;
  onChangeView: (view: SubscriptionRequestStatus) => void;
  pendingCount: number;
  requests: AdminSubscriptionRequest[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

const RejectButton: React.FC<{ onReject: (reason?: string) => void }> = ({ onReject }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
      >
        <XCircle className="w-3.5 h-3.5" /> Reject
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-black text-slate-900">Reject this upgrade request?</h3>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional, shown internally only)"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-100 transition-all"
        />
        <div className="space-y-2 pt-1">
          <button
            onClick={() => { onReject(reason.trim() || undefined); setOpen(false); setReason(''); }}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all"
          >
            Yes, reject request
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-2 text-slate-400 font-bold text-[11px] hover:text-slate-600 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const SubscriptionRequestsQueue = ({ requestsView, onChangeView, pendingCount, requests, loading, onApprove, onReject }: SubscriptionRequestsQueueProps) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-extrabold text-slate-900">Subscription Upgrade Requests</h3>
        <p className="text-xs text-slate-500 font-medium">
          Businesses asking to change plans — verify payment and activate here
        </p>
      </div>
      <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl text-xs font-bold w-full sm:w-auto">
        <button
          onClick={() => onChangeView('PENDING')}
          className={`px-4 py-2 rounded-xl transition-all ${requestsView === 'PENDING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Pending {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => onChangeView('APPROVED')}
          className={`px-4 py-2 rounded-xl transition-all ${requestsView === 'APPROVED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Approved
        </button>
        <button
          onClick={() => onChangeView('REJECTED')}
          className={`px-4 py-2 rounded-xl transition-all ${requestsView === 'REJECTED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Rejected
        </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-semibold">Loading requests…</div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-700">
            {requestsView === 'PENDING' ? 'Nothing pending' : requestsView === 'APPROVED' ? 'No approved requests yet' : 'No rejected requests'}
          </h4>
          <p className="text-xs text-slate-400">
            {requestsView === 'PENDING'
              ? 'New plan-change requests from businesses will land here.'
              : 'Reviewed requests move here as a permanent log.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Business</th>
                <th className="px-5 py-3.5">Requested Plan</th>
                <th className="px-5 py-3.5">Cycle</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Claim</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {requests.map((r) => {
                const business = typeof r.businessId === 'string' ? null : r.businessId;
                const plan = typeof r.planId === 'string' ? null : r.planId;
                return (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900">{business?.name || 'Unknown business'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">/c/{business?.slug}</div>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-900">{plan?.name || '—'}</td>
                    <td className="px-5 py-4 text-slate-500">{r.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}</td>
                    <td className="px-5 py-4 font-black text-slate-900">{formatCurrency(r.amountPaise)}</td>
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
                      {requestsView === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <RejectButton onReject={(reason) => onReject(r._id, reason)} />
                          <button
                            onClick={() => onApprove(r._id)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        </div>
                      ) : requestsView === 'REJECTED' ? (
                        <span className="text-[10px] text-slate-400">{r.rejectionReason || 'No reason given'}</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold">Activated</span>
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

export default SubscriptionRequestsQueue;
