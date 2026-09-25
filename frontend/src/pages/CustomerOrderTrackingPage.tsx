import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Coffee, CheckCircle2, Clock, Utensils, Sparkles, Printer, ArrowLeft, ShieldCheck, Check
} from 'lucide-react';
import publicOrdersService from '../services/public/orders';
import { getSocket, joinOrderRoom, onReconnect } from '../services/socket';
import { PaymentPanel } from '@/organisms/Payments/PaymentPanel';
import { SupportWidget } from '@/organisms/SupportWidget';

export const CustomerOrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetails = async () => {
    try {
      if (!orderId) return;
      const res = await publicOrdersService.get(orderId);
      setOrder(res.data.order);
      setBusiness(res.data.business);
    } catch (err) {
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();

    if (orderId) {
      const socket = getSocket();
      joinOrderRoom(orderId);

      socket.on('order:status_updated', (updated: any) => {
        setOrder((prev: any) => (prev
          ? { ...prev, orderStatus: updated.orderStatus, paymentStatus: updated.paymentStatus, refundedAt: updated.refundedAt ?? prev.refundedAt }
          : prev));
      });

      // A status change during a dropped connection (phone switching networks, screen locked)
      // is never re-sent — re-read the order once the room is re-joined.
      const stopResync = onReconnect(fetchOrderDetails);

      return () => {
        socket.off('order:status_updated');
        stopResync();
      };
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <Coffee className="w-8 h-8 text-orange-500 animate-bounce mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Loading live order status...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'PLACED', label: 'Order Placed' },
    { key: 'CONFIRMED', label: 'Order Confirmed' },
    { key: 'PREPARING', label: 'Cooking in Kitchen' },
    { key: 'READY', label: 'Ready to Serve' },
    { key: 'COMPLETED', label: 'Served & Enjoy!' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === (order?.orderStatus || 'PLACED'));
  const isPaid = order?.paymentStatus === 'PAID';
  const isRefunded = order?.paymentStatus === 'REFUNDED';
  const isCancelled = order?.orderStatus === 'CANCELLED' || order?.orderStatus === 'REFUNDED';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 max-w-md mx-auto relative border-x border-slate-200 font-sans pb-12">
      
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 bg-white -mx-4 px-4 pt-2">
        <Link to={`/c/${business?.slug || 'artisan-cafe'}`} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Live Kitchen Tracker
        </span>
        <button onClick={() => window.print()} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* ── Main Order Card ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center mb-6 relative overflow-hidden space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center mx-auto shadow-sm">
          <Coffee className="w-7 h-7" />
        </div>

        <div>
          <span className="text-xs font-extrabold text-orange-600 uppercase tracking-widest block mb-0.5">
            Order #{order?.orderNumber}
          </span>
          <h2 className="text-xl font-black text-slate-900">{business?.name || 'Artisan Roastery'}</h2>
          <p className="text-xs text-slate-400 font-medium">{order?.tableName || 'Table 01'} • Guest: {order?.customerName}</p>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
          isRefunded
            ? 'bg-violet-50 text-violet-700 border-violet-200'
            : isPaid
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {isRefunded
            ? `Refunded (${order?.paymentMethod})`
            : isPaid
            ? `Paid (${order?.paymentMethod})`
            : `Payment Pending (${order?.paymentMethod})`}
        </div>

        {/* ── Realtime Status Stepper ──────────────────────────── */}
        {isCancelled ? (
          <div className={`mt-6 pt-6 border-t border-slate-100 text-center space-y-1 ${isRefunded ? 'text-violet-700' : 'text-rose-700'}`}>
            <span className="text-xs font-black uppercase tracking-wider block">
              {isRefunded ? 'Order Cancelled & Refunded' : 'Order Cancelled'}
            </span>
            <p className="text-[11px] font-medium text-slate-400">
              {isRefunded
                ? 'This order was cancelled and your payment has been refunded.'
                : 'This order will not be prepared.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
              Your Order Progress
            </span>

            <div className="space-y-4 relative pl-1">
              {steps.map((st, idx) => {
                const isPassed = idx <= (currentStepIndex === -1 ? 0 : currentStepIndex);
                const isCurrent = idx === (currentStepIndex === -1 ? 0 : currentStepIndex);
                return (
                  <div key={st.key} className="flex items-center gap-3.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isCurrent
                          ? 'bg-orange-500 text-white ring-4 ring-orange-100 shadow-md shadow-orange-500/20'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-extrabold ${
                      isCurrent ? 'text-orange-600 font-black' : isPassed ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Payment (Online orders only — cash orders just show the pill above) ── */}
      {order?.paymentMethod === 'ONLINE' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 mb-6">
          <h3 className="font-black text-slate-900 text-sm">Payment</h3>
          <PaymentPanel
            orderId={order._id}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
            orderStatus={order.orderStatus}
            customerMarkedPaidAt={order.customerMarkedPaidAt}
            refundRequestedAt={order.refundRequestedAt}
            refundedAt={order.refundedAt}
            payeeVpa={business?.upiVpa}
            payeeName={business?.name}
            amount={(order.totalAmountPaise || 0) / 100}
            onOrderChanged={fetchOrderDetails}
          />
        </div>
      )}

      {/* ── Digital E-Bill Breakdown Card ────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm">Your Bill</h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(order?.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {order?.items?.map((it: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-slate-700">
              <span className="font-semibold">{it.quantity}× {it.name}</span>
              <span className="font-bold text-slate-900">₹{((it.itemTotalPaise || (it.pricePaise * it.quantity) || 0) / 100).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-slate-500 font-medium">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{((order?.subtotalPaise || 0) / 100).toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST Tax</span>
            <span>₹{((order?.taxPaise || 0) / 100).toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Paid Amount</span>
            <span className="text-emerald-600">₹{((order?.totalAmountPaise || 0) / 100).toFixed(0)}</span>
          </div>
        </div>
      </div>

      {business && order?.businessId && (
        <SupportWidget
          mode="CUSTOMER"
          // orderController.getOrderById returns a hand-curated `business` object with no
          // _id/id field (it predates this widget) — order.businessId is the one reliable
          // source for this on this page.
          businessId={order.businessId}
          orderId={order?._id}
          prefill={{ name: order?.customerName, phone: order?.customerPhone }}
        />
      )}
    </div>
  );
};
export default CustomerOrderTrackingPage;
