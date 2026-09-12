
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, ChefHat, PartyPopper, ArrowLeft } from 'lucide-react';
import { useOrder } from '@/hooks/useOrder';
import { PaymentPanel } from '@/components/payments/PaymentPanel';

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  PENDING_ACCEPTANCE: {
    label: 'Waiting for the business to accept',
    icon: <Clock className="w-4 h-4" />,
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ACCEPTED: {
    label: 'Order accepted — being prepared',
    icon: <ChefHat className="w-4 h-4" />,
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  PAID: {
    label: 'Payment confirmed',
    icon: <CheckCircle2 className="w-4 h-4" />,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  COMPLETED: {
    label: 'Order complete',
    icon: <PartyPopper className="w-4 h-4" />,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const OrderConfirmationPage: React.FC = () => {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const { order, loading, error } = useOrder(orderId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-xs font-bold text-slate-400">Loading your order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-xs font-bold text-slate-700">Couldn't load this order.</p>
        <p className="text-[11px] text-slate-400">{error}</p>
        <Link to={`/c/${slug}`} className="text-xs font-bold text-orange-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to menu
        </Link>
      </div>
    );
  }

  const status = STATUS_META[order.status] || STATUS_META.PENDING_ACCEPTANCE;
  const totalRupees = order.totalAmountPaise / 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10 max-w-md mx-auto relative shadow-xl border-x border-slate-200 font-sans">
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-black text-slate-900">Order placed</h1>
          <p className="text-[11px] text-slate-400 font-medium">
            {order.business?.name} • Order #{orderId?.slice(-6).toUpperCase()}
          </p>
        </div>

        <div
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold ${status.tone}`}
        >
          {status.icon}
          {status.label}
        </div>

        {/* Order items */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-2">
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">
                {item.name} <span className="text-slate-400 font-medium">× {item.quantity}</span>
              </span>
              <span className="font-extrabold text-slate-900">
                ₹{((item.pricePaise * item.quantity) / 100).toFixed(0)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>₹{totalRupees.toFixed(0)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-xs font-black text-slate-900 mb-3">Payment</h2>
          <PaymentPanel
            paymentMethod={order.paymentMethod}
            payeeVpa={order.business?.upiVpa}
            payeeName={order.business?.name}
            amount={totalRupees}
            transactionRef={order._id}
          />
        </div>

        <Link
          to={`/c/${slug}`}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors pt-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to menu
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;