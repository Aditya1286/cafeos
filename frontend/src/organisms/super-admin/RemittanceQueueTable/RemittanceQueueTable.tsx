import React from 'react';
import { Wallet, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/utils/money';
import { AdminRemittanceRequest } from '@/types';
import ResponsiveDataView from '@/molecules/ResponsiveDataView';

interface RemittanceQueueTableProps {
  remittanceView: 'UNPAID' | 'PAID';
  onChangeView: (view: 'UNPAID' | 'PAID') => void;
  pendingCount: number;
  requests: AdminRemittanceRequest[];
  loading: boolean;
  onMarkPaid: (id: string) => void;
  onUnmarkPaid: (id: string) => void;
}

const businessOf = (r: AdminRemittanceRequest) => (typeof r.businessId === 'string' ? null : r.businessId);

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const periodLabel = (r: AdminRemittanceRequest) => `${shortDate(r.periodStart)} – ${shortDate(r.periodEnd)}`;

const DueOrPaid = ({ r, view }: { r: AdminRemittanceRequest; view: 'UNPAID' | 'PAID' }) => {
  if (view === 'UNPAID') {
    const isOverdue = r.status === 'UNPAID' && new Date(r.dueDate) < new Date();
    return (
      <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>
        Due {shortDate(r.dueDate)}{isOverdue && ' · Overdue'}
      </span>
    );
  }
  return (
    <span className="text-slate-600">
      {r.paidAt ? `Paid ${new Date(r.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : '—'}
      {r.markedPaidByUserId?.name && <span className="block text-[10px] text-slate-400">by {r.markedPaidByUserId.name}</span>}
    </span>
  );
};

const ClaimBadge = ({ r }: { r: AdminRemittanceRequest }) =>
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

const RowAction = ({ r, view, onMarkPaid, onUnmarkPaid, fullWidth = false }: {
  r: AdminRemittanceRequest;
  view: 'UNPAID' | 'PAID';
  onMarkPaid: (id: string) => void;
  onUnmarkPaid: (id: string) => void;
  fullWidth?: boolean;
}) =>
  view === 'UNPAID' ? (
    <button
      onClick={() => onMarkPaid(r._id)}
      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-1 ${fullWidth ? 'w-full py-2' : ''}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
    </button>
  ) : (
    <button
      onClick={() => onUnmarkPaid(r._id)}
      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-flex items-center justify-center gap-1 ${fullWidth ? 'w-full py-2' : ''}`}
    >
      <RotateCcw className="w-3.5 h-3.5" /> Unmark
    </button>
  );

export const RemittanceQueueTable = ({ remittanceView, onChangeView, pendingCount, requests, loading, onMarkPaid, onUnmarkPaid }: RemittanceQueueTableProps) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">Fee Payments</h3>
        <p className="text-xs text-slate-500 font-medium">
          Fees each business owes us — check the payment, then mark it paid
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
          Paid
        </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-semibold">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-black text-slate-700">
            {remittanceView === 'UNPAID' ? 'Nothing outstanding' : 'Nothing paid yet'}
          </h4>
          <p className="text-xs text-slate-400">
            {remittanceView === 'UNPAID'
              ? 'Every business is paid up. New bills show up here when a billing period ends.'
              : 'Payments you mark as paid are kept here.'}
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
            { header: 'Period', render: (r) => <span className="text-slate-500 whitespace-nowrap">{periodLabel(r)}</span> },
            { header: 'Orders', render: (r) => r.ordersCount },
            { header: 'Gross', render: (r) => formatCurrency(r.grossAmountPaise) },
            { header: 'Commission', render: (r) => <span className="font-black text-slate-900">{formatCurrency(r.commissionOwedPaise)}</span> },
            { header: remittanceView === 'UNPAID' ? 'Due' : 'Paid', render: (r) => <DueOrPaid r={r} view={remittanceView} /> },
            { header: 'Claim', render: (r) => <ClaimBadge r={r} /> },
            {
              header: 'Action',
              align: 'right',
              render: (r) => <RowAction r={r} view={remittanceView} onMarkPaid={onMarkPaid} onUnmarkPaid={onUnmarkPaid} />,
            },
          ]}
          renderCard={(r) => (
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{businessOf(r)?.name || 'Unknown business'}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{periodLabel(r)} · {r.ordersCount} orders</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 text-sm">{formatCurrency(r.commissionOwedPaise)}</div>
                  <div className="text-[10px] font-bold text-slate-400">of {formatCurrency(r.grossAmountPaise)} gross</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                <DueOrPaid r={r} view={remittanceView} />
                <ClaimBadge r={r} />
              </div>
              <RowAction r={r} view={remittanceView} onMarkPaid={onMarkPaid} onUnmarkPaid={onUnmarkPaid} fullWidth />
            </div>
          )}
        />
      )}
    </div>
  </div>
);

export default RemittanceQueueTable;
