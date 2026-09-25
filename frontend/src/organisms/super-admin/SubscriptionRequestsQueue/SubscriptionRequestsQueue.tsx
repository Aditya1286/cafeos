import React, { useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/money';
import { AdminSubscriptionRequest, SubscriptionRequestStatus } from '@/types';
import ResponsiveDataView from '@/molecules/ResponsiveDataView';

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
        className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors inline-flex items-center justify-center gap-1"
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
          placeholder="Reason (optional, only our team sees this)"
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

const businessOf = (r: AdminSubscriptionRequest) => (typeof r.businessId === 'string' ? null : r.businessId);
const planOf = (r: AdminSubscriptionRequest) => (typeof r.planId === 'string' ? null : r.planId);

const ClaimBadge = ({ r }: { r: AdminSubscriptionRequest }) =>
  r.merchantMarkedPaidAt ? (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-extrabold border border-orange-200 whitespace-nowrap"
      title={r.merchantReportedUtr ? `UTR: ${r.merchantReportedUtr}` : 'No reference given'}
    >
      <AlertTriangle className="w-3 h-3" /> Says they paid{r.merchantReportedUtr ? ` · ${r.merchantReportedUtr}` : ''}
    </span>
  ) : (
    <span className="text-slate-300">—</span>
  );

const RequestOutcome = ({ r, view, onApprove, onReject, fullWidth = false }: {
  r: AdminSubscriptionRequest;
  view: SubscriptionRequestStatus;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  fullWidth?: boolean;
}) => {
  if (view === 'PENDING') {
    return (
      <div className={`flex items-center gap-2 ${fullWidth ? '[&>*]:flex-1' : 'justify-end'}`}>
        <RejectButton onReject={(reason) => onReject(r._id, reason)} />
        <button
          onClick={() => onApprove(r._id)}
          className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
        </button>
      </div>
    );
  }
  return view === 'REJECTED'
    ? <span className="text-[10px] text-slate-400">{r.rejectionReason || 'No reason given'}</span>
    : <span className="text-[10px] text-emerald-600 font-bold">Activated</span>;
};

export const SubscriptionRequestsQueue = ({ requestsView, onChangeView, pendingCount, requests, loading, onApprove, onReject }: SubscriptionRequestsQueueProps) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">Plan Change Requests</h3>
        <p className="text-xs text-slate-500 font-medium">
          Businesses asking to switch plans — check their payment, then approve
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
              ? 'New requests from businesses will show up here.'
              : 'Requests you’ve reviewed are kept here.'}
          </p>
        </div>
      ) : (
        <ResponsiveDataView
          data={requests}
          keyExtractor={(r) => r._id}
          breakpoint="lg"
          columns={[
            {
              header: 'Business',
              render: (r) => (
                <>
                  <div className="font-black text-slate-900">{businessOf(r)?.name || 'Unknown business'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">/c/{businessOf(r)?.slug}</div>
                </>
              ),
            },
            { header: 'Requested Plan', render: (r) => <span className="font-black text-slate-900">{planOf(r)?.name || '—'}</span> },
            { header: 'Cycle', render: (r) => <span className="text-slate-500">{r.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}</span> },
            { header: 'Amount', render: (r) => <span className="font-black text-slate-900">{formatCurrency(r.amountPaise)}</span> },
            { header: 'Claim', render: (r) => <ClaimBadge r={r} /> },
            {
              header: 'Action',
              align: 'right',
              render: (r) => <RequestOutcome r={r} view={requestsView} onApprove={onApprove} onReject={onReject} />,
            },
          ]}
          renderCard={(r) => (
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{businessOf(r)?.name || 'Unknown business'}</div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    {planOf(r)?.name || '—'} · {r.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}
                  </div>
                </div>
                <div className="font-black text-slate-900 text-sm shrink-0">{formatCurrency(r.amountPaise)}</div>
              </div>
              <ClaimBadge r={r} />
              <RequestOutcome r={r} view={requestsView} onApprove={onApprove} onReject={onReject} fullWidth />
            </div>
          )}
        />
      )}
    </div>
  </div>
);

export default SubscriptionRequestsQueue;
