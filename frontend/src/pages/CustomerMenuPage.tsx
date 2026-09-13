import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Coffee,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  ChevronRight,
  X,
  Sparkles,
  Clock,
  Star,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import confetti from 'canvas-confetti';
import { useOtpVerification } from '@/hooks/useOtpVerification';
import { formatTime } from '@/utils/DateUtils';
import { toast } from '@/utils/toast';

export const CustomerMenuPage: React.FC = () => {
  const { slug, qrToken } = useParams<{ slug: string; qrToken?: string }>();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);

  // Cart State: { [productId]: { product, quantity } }
  const [cart, setCart] = useState<Record<string, any>>({});
  const [showCheckoutDrawer, setShowCheckoutDrawer] = useState(false);

  // Customer guest details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH'>('ONLINE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  //Adding custom otp handler
  const otp = useOtpVerification(customerPhone);

  useEffect(() => {
    const fetchBusinessAndMenu = async () => {
      try {
        if (qrToken) {
          const tblRes = await apiRequest(`/public/t/${qrToken}`);
          setTable(tblRes.data.table);
          setBusiness(tblRes.data.business);

          const menuRes = await apiRequest(
            `/public/c/${tblRes.data.business.id || tblRes.data.business._id}/menu`,
          );
          setCategories(menuRes.data.categories || []);
          setProducts(menuRes.data.products || []);
        } else if (slug) {
          const businessRes = await apiRequest(`/public/c/${slug}`);
          setBusiness(businessRes.data);

          const menuRes = await apiRequest(`/public/c/${businessRes.data._id}/menu`);
          setCategories(menuRes.data.categories || []);
          setProducts(menuRes.data.products || []);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load menu.');
      }
    };

    fetchBusinessAndMenu();
  }, [slug, qrToken]);

  const handleAddToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev[product._id];
      if (existing) {
        return { ...prev, [product._id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [product._id]: { product, quantity: 1 } };
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartItemsList = Object.values(cart);
  const cartSubtotalPaise = cartItemsList.reduce(
    (acc, item) => acc + item.product.pricePaise * item.quantity,
    0,
  );
  const orderContextLabel = table
    ? table.tableNumber
    : business?.tablesEnabled === false
      ? 'Counter Order'
      : 'Scan Table QR';

  const taxRate = business?.taxRatePercentage || 5;
  const taxPaise = Math.round((cartSubtotalPaise * taxRate) / 100);
  const totalAmountPaise = cartSubtotalPaise + taxPaise;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error('Please enter your name and phone number');
      return;
    }
    if (!otp.otpVerified) {
      toast.error('Please verify your phone number first.');
      return;
    }
    setSubmitting(true);
    try {
      const resolvedQrToken = qrToken || table?.qrToken;
      const payload: Record<string, any> = {
        customerName,
        customerPhone,
        paymentMethod,
        items: cartItemsList.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          name: item.product.name,
        })),
      };
      if (resolvedQrToken) {
        payload.qrToken = resolvedQrToken;
      } else {
        payload.businessSlug = business?.slug;
      }

      const res = await apiRequest('/public/orders', 'POST', payload);

      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}

      navigate(`/c/${business?.slug}/order/${res.data._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !isVegOnly || p.isVeg;
    return matchesCategory && matchesSearch && matchesVeg;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 selection:bg-orange-500 selection:text-white max-w-md mx-auto relative shadow-xl border-x border-slate-200 font-sans">
      {/* ── Top Hero Header (Swiggy / Zomato Aesthetic) ────────────────── */}
      <div className="relative bg-white border-b border-slate-200">
        <div className="h-44 relative overflow-hidden bg-slate-100">
          <img
            src={
              business?.coverImageUrl ||
              'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80'
            }
            alt="Business Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Table Badge */}
          <div className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md text-xs font-black text-orange-600 border border-orange-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            {orderContextLabel}
          </div>
        </div>

        {/* Business Card Overlay */}
        <div className="px-4 pb-4 -mt-10 relative z-10">
          <div className="bg-white rounded-3xl p-4 shadow-lg border border-slate-100 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-tight">
                  {business?.name || 'The Artisan Roastery'}
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                  <span className="truncate">{business?.address || 'Bandra West, Mumbai'}</span>
                </p>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center gap-1 shrink-0">
                <span>4.8</span>
                <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                15-20 min prep time
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-extrabold uppercase">
                Contactless QR Order
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────── */}
      <div className="sticky top-0 bg-white z-20 px-4 py-3 border-b border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search for coffee, pizza, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all font-medium"
            />
          </div>

          {/* Veg Only Toggle Button */}
          <button
            onClick={() => setIsVegOnly(!isVegOnly)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
              isVegOnly
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isVegOnly ? 'border-emerald-600 bg-white' : 'border-slate-400'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isVegOnly ? 'bg-emerald-600' : 'bg-slate-400'}`}
              />
            </span>
            Veg Only
          </button>
        </div>

        {/* Categories Horizontal Capsule Scroll Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === cat._id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product List (Swiggy / Zomato Style) ────────────────────────── */}
      <div className="p-4 space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No menu items found</h3>
            <p className="text-xs text-slate-400">Try adjusting your search or veg filter</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCart = cart[product._id];
            return (
              <div
                key={product._id}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex justify-between gap-4 items-start relative overflow-hidden"
              >
                {/* Left side details */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Veg/Non-Veg icon badge */}
                    <span
                      className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                        product.isVeg ? 'border-emerald-600' : 'border-rose-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}
                      />
                    </span>
                    {product.preparationTimeMinutes && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {product.preparationTimeMinutes} mins
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 mb-1 leading-snug">
                    {product.name}
                  </h3>

                  <div className="text-sm font-black text-slate-900 mb-1.5">
                    ₹{(product.pricePaise / 100).toFixed(0)}
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Right side image & ADD button */}
                <div className="relative shrink-0 flex flex-col items-center">
                  <img
                    src={
                      product.imageUrl ||
                      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'
                    }
                    alt={product.name}
                    className="w-28 h-28 rounded-2xl object-cover shadow-sm bg-slate-100"
                  />

                  {/* Swiggy Style ADD Floating Button */}
                  <div className="mt-[-16px] z-10">
                    {inCart ? (
                      <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-xl px-3 py-1.5 shadow-lg font-black text-xs">
                        <button
                          onClick={() => handleRemoveFromCart(product._id)}
                          className="hover:scale-125 transition-transform"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span>{inCart.quantity}</span>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="hover:scale-125 transition-transform"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="px-6 py-2 rounded-xl bg-white border border-emerald-500 text-emerald-600 font-extrabold text-xs shadow-md hover:bg-emerald-50 transition-all uppercase tracking-wider"
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Sticky Bottom Floating Cart Bar (Swiggy/Zomato Aesthetic) ───── */}
      {cartItemsList.length > 0 && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-30">
          <button
            onClick={() => setShowCheckoutDrawer(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-2xl shadow-emerald-600/40 flex items-center justify-between transition-all transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-white/20 text-white text-xs font-black flex items-center justify-center">
                {cartItemsList.reduce((a, b) => a + b.quantity, 0)}
              </span>
              <div className="text-left">
                <div className="text-xs font-black leading-tight">View Cart</div>
                <div className="text-[10px] text-emerald-100 font-medium">Items added</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm font-black">
              <span>₹{(totalAmountPaise / 100).toFixed(0)}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* ── Checkout Drawer Sheet ────────────────────────────────────────── */}
      {showCheckoutDrawer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-6 space-y-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-500" /> Confirm Your Order
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {orderContextLabel} • {business?.name || 'Artisan Roastery'}
                </p>
              </div>
              <button
                onClick={() => setShowCheckoutDrawer(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items Summary */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {cartItemsList.map((item) => (
                <div key={item.product._id} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${item.product.isVeg ? 'border-emerald-600' : 'border-rose-600'}`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${item.product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}
                      />
                    </span>
                    <span className="font-bold text-slate-800">{item.product.name}</span>
                    <span className="text-slate-400 font-medium">× {item.quantity}</span>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    ₹{((item.product.pricePaise * item.quantity) / 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Item Total</span>
                <span>₹{(cartSubtotalPaise / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>GST Tax ({taxRate}%)</span>
                <span>₹{(taxPaise / 100).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>To Pay</span>
                <span className="text-emerald-600">₹{(totalAmountPaise / 100).toFixed(0)}</span>
              </div>
            </div>

            {/* Guest Details Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    disabled={otp.otpVerified}
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all disabled:opacity-60"
                  />
                  {!otp.otpVerified && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={otp.sendOtp}
                        disabled={otp.sending || !otp.canResend}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-extrabold whitespace-nowrap disabled:opacity-40 transition-all"
                      >
                        {otp.sending ? 'Sending...' : otp.otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>

                      {otp.otpSent && !otp.canResend && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(otp.resendSecondsLeft)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Staging-only: backend echoes the OTP back instead of sending a
                    real SMS, so testers don't need a phone to complete the flow.
                    This never appears against the production OTP provider. */}
                {otp.devOtp && (
                  <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-dashed border-amber-300 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700">
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-400/30 uppercase tracking-wider">
                        Staging
                      </span>
                      Test OTP
                    </span>
                    <span className="text-sm font-black text-amber-800 tracking-[0.2em]">
                      {otp.devOtp}
                    </span>
                  </div>
                )}

                {otp.otpVerified && (
                  <p className="mt-1.5 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Phone verified
                  </p>
                )}

                {otp.otpSent && !otp.otpVerified && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter OTP"
                      value={otp.otpCode}
                      onChange={(e) =>
                        otp.setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={otp.verifyOtp}
                      disabled={otp.verifying}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-extrabold whitespace-nowrap disabled:opacity-40"
                    >
                      {otp.verifying ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                )}

                {otp.error && (
                  <p className="mt-1.5 text-[11px] font-bold text-rose-600">{otp.error}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ONLINE', label: 'Online' },
                    { id: 'CASH', label: 'Pay at Counter' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`py-2 text-[11px] font-extrabold rounded-xl border transition-all ${
                        paymentMethod === pm.id
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-400 shadow-sm'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !otp.otpVerified}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xl shadow-emerald-600/30 transition-all disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2 mt-3"
              >
                {submitting ? (
                  <span>Placing Order...</span>
                ) : !otp.otpVerified ? (
                  <span>Verify phone to continue</span>
                ) : (
                  <>
                    <span>Pay & Place Order • ₹{(totalAmountPaise / 100).toFixed(0)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerMenuPage;
