import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, XCircle, HelpCircle, Undo2 } from 'lucide-react';
import { isMobileDevice } from '@/utils/device';
import publicOrdersService from '@/services/public/orders';
import { UpiAppButtons } from '@/molecules/Payments/UpiAppButtons';
import { UpiQrFallback } from '@/molecules/Payments/UpiQrFallback';

interface PaymentPanelProps {
  orderId: string;
  paymentMethod: 'ONLINE' | 'CASH' | 'CHECKOUT';
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';
  orderStatus: string;
  customerMarkedPaidAt?: string | null;
  refundRequestedAt?: string | null;
  refundedAt?: string | null;
  payeeVpa?: string;
  payeeName: string;
  amount: number; // rupees
  onOrderChanged: () => void;
}

/**
 * For direct-UPI (ONLINE) orders there's no gateway, so there's no payment
 * webhook — the business confirms receipt on their own dashboard. (CHECKOUT
 * orders were already confirmed by SMEPay before they existed; this panel
 * only shows them as paid, or offers a refund request if cancelled.) This panel's job is to
 * get the customer's money moving (UPI deep link / QR) and then capture
 * what happened next ("I paid" vs "I didn't, cancel it") as a clear
 * customer-reported signal, not to assert that payment actually succeeded.
 */
export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  orderId,
  paymentMethod,
  paymentStatus,
  orderStatus,
  customerMarkedPaidAt,
  refundRequestedAt,
  refundedAt,
  payeeVpa,
  payeeName,
  amount,
  onOrderChanged,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [outcome, setOutcome] = useState<'placed' | 'cancelled' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundJustRequested, setRefundJustRequested] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const handleRequestRefund = async () => {
    setSubmittingRefund(true);
    setActionError(null);
    try {
      await publicOrdersService.requestRefund(orderId, refundReason);
      setRefundJustRequested(true);
      onOrderChanged();
    } catch (err: any) {
      setActionError(err.message || 'Could not submit your refund request.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (orderStatus === 'CANCELLED') {
    if (paymentStatus === 'REFUNDED') {
      return (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-center space-y-1">
          <Undo2 className="w-6 h-6 text-violet-600 mx-auto" />
          <p className="text-xs font-black text-violet-700">Refunded</p>
          {refundedAt && (
            <p className="text-[11px] text-violet-600">
              on{' '}
              {new Date(refundedAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      );
    }

    if (paymentStatus !== 'PAID') {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-xs font-bold text-rose-700">This order was cancelled.</p>
        </div>
      );
    }

    // Paid, then cancelled — the customer's money needs to actually come back.
    if (refundJustRequested || refundRequestedAt) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center space-y-1">
          <HelpCircle className="w-6 h-6 text-amber-600 mx-auto" />
          <p className="text-xs font-black text-amber-700">Refund requested</p>
          <p className="text-[11px] text-amber-600">
            The business will process this and confirm here.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
        <div className="text-center space-y-1">
          <XCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs font-black text-rose-700">
            This order was cancelled after you paid
          </p>
          <p className="text-[11px] text-rose-600">
            Request a refund and the business will process it.
          </p>
        </div>

        {actionError && (
          <p className="text-[11px] font-bold text-rose-700 text-center">{actionError}</p>
        )}

        <textarea
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          placeholder="Anything the business should know? (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-rose-400"
        />

        <button
          type="button"
          onClick={handleRequestRefund}
          disabled={submittingRefund}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
        >
          {submittingRefund ? 'Requesting…' : 'Request a Refund'}
        </button>
      </div>
    );
  }

  if (paymentMethod === 'CASH') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-700">Pay at the counter</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Show this screen when you're ready to pay.
        </p>
      </div>
    );
  }

  if (paymentStatus === 'PAID') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-1">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
        <p className="text-xs font-black text-emerald-700">Payment confirmed</p>
        {paymentMethod === 'CHECKOUT' && (
          <p className="text-[11px] text-emerald-600">
            Paid online — no need to pay at the counter.
          </p>
        )}
      </div>
    );
  }

  // A CHECKOUT order only exists once SMEPay confirmed it, so it's always PAID (or cancelled,
  // handled above) — never fall through to the direct-UPI flow below for one.
  if (paymentMethod === 'CHECKOUT') {
    return null;
  }

  if (!payeeVpa) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-xs font-bold text-amber-700">
          Online payment isn't set up for this business yet.
        </p>
        <p className="text-[11px] text-amber-600 mt-1">Please pay at the counter instead.</p>
      </div>
    );
  }

  const handleConfirmPaid = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await publicOrdersService.markPaid(orderId);
      setOutcome('placed');
      setShowConfirmModal(false);
      onOrderChanged();
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await publicOrdersService.cancel(orderId);
      setOutcome('cancelled');
      setShowConfirmModal(false);
      onOrderChanged();
    } catch (err: any) {
      setActionError(err.message || 'Could not cancel this order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (outcome === 'placed' || customerMarkedPaidAt) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-1">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
        <p className="text-xs font-black text-emerald-700">Order placed</p>
        <p className="text-[11px] text-emerald-600">
          The business will confirm your payment shortly.
        </p>
      </div>
    );
  }

  if (outcome === 'cancelled') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center space-y-1">
        <XCircle className="w-6 h-6 text-rose-600 mx-auto" />
        <p className="text-xs font-black text-rose-700">Order cancelled</p>
      </div>
    );
  }

  const upiParams = { payeeVpa, payeeName, amount, transactionRef: orderId };

  return (
    <div className="space-y-4">
      {isMobileDevice() ? <UpiAppButtons {...upiParams} /> : <UpiQrFallback {...upiParams} />}

      <button
        type="button"
        onClick={() => setShowConfirmModal(true)}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[11px] hover:bg-slate-50 transition-all"
      >
        I've completed the payment
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        Payment goes directly to the business
      </p>

      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-8 h-8 text-orange-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Did your payment go through?</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Let us know so we can let the business know.
              </p>
            </div>

            {actionError && <p className="text-[11px] font-bold text-rose-600">{actionError}</p>}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                Yes — Order Placed
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs transition-all disabled:opacity-50"
              >
                No — Cancel Order
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="w-full py-2 text-slate-400 font-bold text-[11px] hover:text-slate-600 transition-all"
              >
                Not yet, keep waiting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
