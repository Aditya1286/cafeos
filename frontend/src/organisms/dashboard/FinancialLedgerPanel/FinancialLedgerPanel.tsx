import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, AlertTriangle, Wallet, CheckCircle2, HelpCircle } from 'lucide-react';
import RemittanceHistoryTable, { RemittancePeriod } from '@/molecules/RemittanceHistoryTable';
import { UpiAppButtons } from '@/molecules/Payments/UpiAppButtons';
import { UpiQrFallback } from '@/molecules/Payments/UpiQrFallback';
import { isMobileDevice } from '@/utils/device';
import { formatCurrency } from '@/utils/money';

interface FinancialLedgerPanelProps {
  business: any;
  remittanceSummary: any;
  loadingRemittance: boolean;
  markingPaid: boolean;
  onMarkPaid: (utr?: string) => void;
}

// "Of every ₹100 a business earns through CafeOS, how much do we actually take?" — a plain
// gross-vs-commission bar across every period we have data for (closed periods + the one in
// progress), so the take-rate reads as a real, small slice rather than an abstract percentage.
const ProfitShareBar: React.FC<{ periods: RemittancePeriod[]; currentPeriod: any }> = ({ periods, currentPeriod }) => {
  const totalGrossPaise = periods.reduce((acc, p) => acc + p.grossAmountPaise, 0) + (currentPeriod?.grossAmountPaise || 0);
  const totalCommissionPaise = periods.reduce((acc, p) => acc + p.commissionOwedPaise, 0) + (currentPeriod?.commissionOwedPaise || 0);

  if (totalGrossPaise === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
        This fills in once you have paid orders — nothing to compare yet.
      </div>
    );
  }

  const merchantSharePaise = totalGrossPaise - totalCommissionPaise;
  const commissionPct = (totalCommissionPaise / totalGrossPaise) * 100;
  const merchantPct = 100 - commissionPct;
  // A wafer-thin true-scale bar (often under 1% wide) is illegible, so the commission segment
  // gets a visible floor purely for rendering — the labeled numbers stay exact either way.
  const commissionWidthPct = Math.max(commissionPct, 2.5);
  const merchantWidthPct = 100 - commissionWidthPct;

  return (
    <div className="space-y-3">
      <div className="flex h-10 rounded-xl overflow-hidden border border-slate-200">
        <div
          className="bg-emerald-500 flex items-center justify-center"
          style={{ width: `${merchantWidthPct}%` }}
          title={`You keep ${merchantPct.toFixed(1)}%`}
        />
        <div
          className="bg-slate-800 flex items-center justify-center"
          style={{ width: `${commissionWidthPct}%` }}
          title={`We take ${commissionPct.toFixed(1)}%`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
          <div>
            <div className="font-black text-slate-900">{merchantPct.toFixed(1)}% · {formatCurrency(merchantSharePaise)}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">You keep</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 shrink-0" />
          <div>
            <div className="font-black text-slate-900">{commissionPct.toFixed(1)}% · {formatCurrency(totalCommissionPaise)}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">We take</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PayCommissionCard: React.FC<{
  business: any;
  remittanceSummary: any;
  markingPaid: boolean;
  onMarkPaid: (utr?: string) => void;
}> = ({ business, remittanceSummary, markingPaid, onMarkPaid }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [utr, setUtr] = useState('');
  const [justClaimed, setJustClaimed] = useState(false);

  const amount = remittanceSummary.totalUnpaidOwedPaise / 100;
  const payeeVpa = remittanceSummary.platformUpiVpa;
  const payeeName = remittanceSummary.platformPayeeName;
  const transactionRef = business?.slug || business?._id || 'commission-settlement';

  const handleConfirm = () => {
    onMarkPaid(utr.trim() || undefined);
    setShowConfirm(false);
    setJustClaimed(true);
    setUtr('');
  };

  if (justClaimed) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="text-xs font-black text-emerald-700">Thanks — noted</p>
          <p className="text-[11px] text-emerald-600">We'll check the payment and update this page soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
          <Wallet className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Pay your fee</h3>
          <p className="text-[11px] text-slate-500 font-medium">{formatCurrency(remittanceSummary.totalUnpaidOwedPaise)} outstanding</p>
        </div>
      </div>

      <div className="max-w-xs">
        {isMobileDevice() ? (
          <UpiAppButtons payeeVpa={payeeVpa} payeeName={payeeName} amount={amount} transactionRef={transactionRef} />
        ) : (
          <UpiQrFallback payeeVpa={payeeVpa} payeeName={payeeName} amount={amount} transactionRef={transactionRef} />
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[11px] hover:bg-slate-50 transition-all"
      >
        I've paid this
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !markingPaid && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-8 h-8 text-orange-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Confirm your payment</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                UPI doesn't tell us automatically — this lets our team know to check for your payment.
              </p>
            </div>

            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="UPI reference number (optional — helps us find it faster)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
            />

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={markingPaid}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                Yes, I've paid {formatCurrency(remittanceSummary.totalUnpaidOwedPaise)}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={markingPaid}
                className="w-full py-2 text-slate-400 font-bold text-[11px] hover:text-slate-600 transition-all"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FinancialLedgerPanel = ({ business, remittanceSummary, loadingRemittance, markingPaid, onMarkPaid }: FinancialLedgerPanelProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-black text-slate-900">Fees & Payments</h2>
      <p className="text-xs text-slate-500 font-medium">
        The fee you owe us for your orders, and when to pay it
      </p>
    </div>

    {loadingRemittance || !remittanceSummary ? (
      <div className="py-16 text-center text-xs text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
        {loadingRemittance ? 'Loading…' : 'No data yet.'}
      </div>
    ) : (
      <>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-xs font-medium text-orange-800 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You pay a {remittanceSummary.commissionRatePercentage}% fee on completed
            orders, excluding GST. Commission accrues into {remittanceSummary.cycleDays}-day
            billing periods — settle each period with us by its due date. Full terms in the{' '}
            <Link to="/terms" target="_blank" className="font-bold underline hover:text-orange-900">
              Merchant Terms of Service
            </Link>.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase">You Owe</div>
            <div className="text-lg font-black text-slate-900">
              {formatCurrency(remittanceSummary.totalUnpaidOwedPaise)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <div className="text-[10px] text-rose-500 font-bold uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Overdue
            </div>
            <div className="text-lg font-black text-rose-700">
              {formatCurrency(remittanceSummary.overdueAmountPaise)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Next Due</div>
            <div className="text-sm font-extrabold text-slate-900">
              {remittanceSummary.nextDueDate
                ? new Date(remittanceSummary.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                : '—'}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase">This Billing Period</div>
            <div className="text-sm font-extrabold text-emerald-600">
              {formatCurrency(remittanceSummary.currentPeriod.commissionOwedPaise)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Not due until {new Date(remittanceSummary.currentPeriod.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>

        {remittanceSummary.totalUnpaidOwedPaise > 0 ? (
          <PayCommissionCard
            business={business}
            remittanceSummary={remittanceSummary}
            markingPaid={markingPaid}
            onMarkPaid={onMarkPaid}
          />
        ) : remittanceSummary.currentPeriod.commissionOwedPaise > 0 ? (
          <div className="bg-white p-5 rounded-3xl border border-dashed border-slate-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 font-medium">
              Nothing to pay yet — {formatCurrency(remittanceSummary.currentPeriod.commissionOwedPaise)} is
              accruing this billing period. It becomes payable once the period closes on{' '}
              {new Date(remittanceSummary.currentPeriod.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              , and a "Pay your fee" option will appear here.
            </p>
          </div>
        ) : null}

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Where your money goes</h3>
            <p className="text-[11px] text-slate-500 font-medium">From every paid order, since you started</p>
          </div>
          <ProfitShareBar periods={remittanceSummary.periods as RemittancePeriod[]} currentPeriod={remittanceSummary.currentPeriod} />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-4">Past Fee Payments</h3>
          <RemittanceHistoryTable periods={remittanceSummary.periods as RemittancePeriod[]} />
        </div>
      </>
    )}
  </div>
);

export default FinancialLedgerPanel;
