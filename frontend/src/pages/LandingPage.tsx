import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Coffee, QrCode, Layers, ShieldCheck, TrendingUp, Zap, 
  UtensilsCrossed, ArrowRight, CheckCircle2, DollarSign, Activity,
  ChevronDown, Check, Star, Play, Sparkles, X, ShieldAlert
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { AppleCardsCarousel } from '../components/AppleCardsCarousel';
import { WhyChooseUs } from '../components/WhyChooseUs';

export const LandingPage: React.FC = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'sales' | 'expenses' | 'reports'>('sales');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowToast(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const testimonials = [
    {
      name: 'Aditya Sharma',
      role: 'Owner & Head Barista',
      cafe: 'The Artisan Roastery, Mumbai',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      quote: 'CaféOS completely eliminated printed paper tickets. Our kitchen staff receives orders instantly, and our table turnover increased by 30% in the first month.'
    },
    {
      name: 'Elena Rostova',
      role: 'Founder & Manager',
      cafe: 'Velvet Espresso & Bakery, Delhi',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      quote: 'The financial ledger is a game changer. I used to spend 2 hours every Sunday matching payments and fees. Now it is double-entry reconciled automatically.'
    },
    {
      name: 'Rohan Deshmukh',
      role: 'Operations Lead',
      cafe: 'Bean & Bloom Chain (3 Locations), Bangalore',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
      quote: 'Our guests love the contactless QR menu. No app downloads needed — they just scan, order, and pay in 45 seconds.'
    }
  ];

  const faqs = [
    {
      q: 'Do I need special hardware to run the KDS (Kitchen Display System)?',
      a: 'No special hardware is required! CaféOS works on any web-enabled browser, including standard iPads, Android tablets, laptops, or smartphones already in your kitchen.'
    },
    {
      q: 'How does the per-order platform fee work?',
      a: 'The platform fee is a flat ₹2 per completed order (configurable from the Super Admin dashboard). Every order generates an immutable double-entry ledger record for gross sales, platform fee, and net restaurant payout.'
    },
    {
      q: 'Can customers order directly without downloading an app?',
      a: 'Yes! Customers scan the unique table QR code, which opens the café’s digital menu directly in their mobile browser. They can browse, select variants, and order as a guest in under 45 seconds.'
    },
    {
      q: 'Can I manage multiple café locations under one account?',
      a: 'Absolutely. Multi-tenant architecture allows café owners to manage multiple branch locations, menus, tables, and staff permissions from a single unified owner dashboard.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      {/* SONNER SIMULATED TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 animate-bounce duration-500">
          <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-2xl shadow-red-600/10 flex items-center gap-3 text-xs max-w-sm">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 flex items-center justify-between">
                <span>New Live Order #1048</span>
                <span className="text-[10px] text-red-600 font-mono font-bold">Just Now</span>
              </p>
              <p className="text-[11px] text-slate-600 truncate">Table 04 • 2x Cold Coffee, 1x Paneer Pizza</p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-28 px-4 lg:px-8 overflow-hidden bg-white border-b border-slate-200/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-red-200/40 via-red-100/60 to-orange-100/40 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Trust Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <span>Trusted by 500+ independent cafés & QSRs</span>
          </div>

          {/* Animated Hero Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1] max-w-4xl mx-auto">
            Run Your Café{' '}
            <span className="relative inline-block text-red-600">
              Smarter.
              <span className="absolute bottom-1 left-0 w-full h-2.5 bg-red-200 rounded-full -z-10" />
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Contactless ordering, real-time kitchen displays, and a financial ledger that actually makes sense — all in one place.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link
              to="/register"
              className="flex items-center gap-2 px-7 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/25 hover:scale-[1.02] transition-all"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/c/artisan-cafe/t/tok_artisan_tbl_01"
              className="flex items-center gap-2 px-7 py-4 rounded-xl bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 font-extrabold text-sm hover:bg-slate-200/80 transition-all"
            >
              <Play className="w-4 h-4 text-red-600 fill-red-600" /> Watch 2-min Demo
            </Link>
          </div>

          {/* Perspective Dashboard Tilt Preview */}
          <div className="relative max-w-5xl mx-auto group">
            <div className="relative bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-2 md:p-4 shadow-2xl shadow-slate-300/60 overflow-hidden transform perspective-1000 rotateX-2 group-hover:rotateX-0 transition-transform duration-700">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="px-4 py-1 rounded-md bg-white text-[11px] font-mono text-slate-600 border border-slate-200 font-semibold">
                  https://app.cafeos.com/dashboard
                </div>
                <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> Live KDS Sync
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left p-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Today's Revenue</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">₹42,850</div>
                  <span className="text-[10px] text-emerald-700 font-bold">↑ 18% vs yesterday</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Active Orders (KDS)</span>
                  <div className="text-2xl font-black text-red-600 mt-1">8 Active</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Avg prep time: 8 mins</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Platform Fee Recorded</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">₹2.00 / order</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Double-entry ledger</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST BAR (LOGO MARQUEE) */}
      <section className="py-10 bg-slate-100/70 border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-6">
            Powering café operations across the country
          </p>

          <div className="flex items-center justify-center flex-wrap gap-8 md:gap-16 text-slate-700 font-bold text-sm md:text-base">
            <span className="flex items-center gap-2"><Coffee className="w-5 h-5 text-red-600" /> The Artisan Roastery</span>
            <span className="flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-red-600" /> Espresso Lab</span>
            <span className="flex items-center gap-2"><Coffee className="w-5 h-5 text-red-600" /> Bean & Bloom</span>
            <span className="flex items-center gap-2"><Coffee className="w-5 h-5 text-red-600" /> Roast & Toast</span>
            <span className="flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-red-600" /> Velvet Brews</span>
          </div>
        </div>
      </section>

      {/* 4. FEATURE SECTION — THREE PILLARS */}
      <section id="features" className="py-24 px-4 lg:px-8 space-y-28 max-w-7xl mx-auto">
        {/* PILLAR A: Contactless Ordering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold">
              <QrCode className="w-6 h-6" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
              Avg. order time: 45 seconds
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Contactless Ordering That Customers Actually Enjoy
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Guests scan, order, and pay — no app download, no waiting for a server. Table QR codes automatically route orders to the kitchen instantly.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 font-semibold">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Zero app installation required (works directly in mobile browser)
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Supports item variants, dietary tags (Veg/Non-Veg), & extra toppings
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Real-time order progress updates sent directly to guest screen
              </li>
            </ul>

            <Link
              to="/c/artisan-cafe/t/tok_artisan_tbl_01"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 text-xs font-bold transition-all shadow-sm"
            >
              Test Live QR Ordering <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl relative">
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-between border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-red-600" /> Artisan Café • Table 02
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">QR Active</span>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
                  <div>
                    <span className="font-bold text-slate-900 block">Paneer Tikka Pizza</span>
                    <span className="text-[10px] text-slate-500">Regular 8" • Extra Cheese</span>
                  </div>
                  <span className="font-black text-red-600">₹299</span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
                  <div>
                    <span className="font-bold text-slate-900 block">Signature Cold Coffee</span>
                    <span className="text-[10px] text-slate-500">Large • Extra Shot</span>
                  </div>
                  <span className="font-black text-red-600">₹169</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-600 text-white text-xs font-extrabold flex items-center justify-between shadow-md shadow-red-600/20">
                <span>Place Order (2 Items)</span>
                <span>₹468</span>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR B: Kitchen Display System (KDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl order-2 md:order-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                <span>Kitchen Ticket Stream</span>
                <span className="text-red-600 font-mono font-bold">3 Active Tickets</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border-2 border-red-500 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-900">
                    <span>#1042 • Table 01</span>
                    <span className="text-[10px] text-red-600 font-mono">2 mins ago</span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold space-y-1">
                    <div>2x Paneer Pizza</div>
                    <div>1x Cold Coffee</div>
                  </div>
                  <button className="w-full py-1.5 rounded-lg bg-red-600 text-white font-bold text-[10px] shadow-sm">
                    Mark Preparing ➔
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-900">
                    <span>#1041 • Table 03</span>
                    <span className="text-[10px] text-emerald-700 font-bold">READY</span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold space-y-1">
                    <div>1x Peri Peri Fries</div>
                    <div>1x Cappuccino</div>
                  </div>
                  <button className="w-full py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px]">
                    Served ✓
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 order-1 md:order-2">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold">
              <Activity className="w-6 h-6" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Kitchen Display System That Ends Order Confusion
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Orders flow straight to the kitchen. No printed tickets, no missed items, no lost checks. Keep chefs and servers in perfect sync.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 font-semibold">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Live WebSocket stream push notifications
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Color-coded preparation timers & audio alert chimes
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Automatic ingredient BOM stock deduction on order completion
              </li>
            </ul>
          </div>
        </div>

        {/* PILLAR C: Financial Ledger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              ₹0 reconciliation errors
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Double-Entry Ledger Built for Monetary Precision
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Know exactly what you made, spent, and owe — without spreadsheets or a bookkeeper on standby. Flat ₹2 per-order platform fee settlement recorded automatically.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 font-semibold">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> All monetary values stored in integer paise for 100% precision
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Immutable ledger records for gross payments, platform fees, and net payouts
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" /> Idempotent webhook verification protects against double charges
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
              {[
                { id: 'sales', label: 'Daily Sales' },
                { id: 'expenses', label: 'Platform Fees' },
                { id: 'reports', label: 'Settlements' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLedgerTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeLedgerTab === tab.id
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeLedgerTab === 'sales' && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Gross Sales Today (48 Orders)</span>
                  <span className="font-extrabold text-emerald-700">₹42,850.00</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">GST Tax Collected (5%)</span>
                  <span className="font-bold text-slate-900">₹2,142.50</span>
                </div>
              </div>
            )}

            {activeLedgerTab === 'expenses' && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Platform Per-Order Fee Rate</span>
                  <span className="font-extrabold text-red-600">₹2.00 / order</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Total Platform Commission (48 orders)</span>
                  <span className="font-bold text-red-600">₹96.00</span>
                </div>
              </div>
            )}

            {activeLedgerTab === 'reports' && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Net Café Payout (Settled)</span>
                  <span className="font-extrabold text-slate-900">₹42,754.00</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Ledger Reconciliation Status</span>
                  <span className="font-extrabold text-emerald-700">100% Matched</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. STATS SECTION */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2">500+</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Independent Cafés</p>
          </div>

          <div>
            <div className="text-4xl md:text-5xl font-black text-red-600 mb-2">2M+</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Orders Processed</p>
          </div>

          <div>
            <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2">30%</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Faster Table Turnover</p>
          </div>

          <div>
            <div className="text-4xl md:text-5xl font-black text-emerald-700 mb-2">99.9%</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">System Uptime</p>
          </div>
        </div>
      </section>

      {/* FEATURED CAFES APPLE CARDS CAROUSEL */}
      <AppleCardsCarousel />

      {/* 6. OLD WAY VS. NEW WAY */}
      <WhyChooseUs />

      {/* 7. TESTIMONIALS */}
      <section className="py-24 px-4 lg:px-8 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-1 mb-4 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-500" />
            ))}
          </div>

          <p className="text-lg md:text-xl font-semibold text-slate-800 italic mb-8 leading-relaxed">
            "{testimonials[testimonialIndex].quote}"
          </p>

          <div className="flex items-center justify-center gap-4">
            <img
              src={testimonials[testimonialIndex].avatar}
              alt={testimonials[testimonialIndex].name}
              className="w-12 h-12 rounded-full object-cover border-2 border-red-600"
            />
            <div className="text-left text-xs">
              <div className="font-bold text-slate-900">{testimonials[testimonialIndex].name}</div>
              <div className="text-slate-500">{testimonials[testimonialIndex].role}</div>
              <div className="text-red-600 font-bold">{testimonials[testimonialIndex].cafe}</div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setTestimonialIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  testimonialIndex === idx ? 'bg-red-600 w-8' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. PRICING TABLE */}
      <section className="py-24 bg-white text-slate-900 relative overflow-hidden border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-md mx-auto mb-8">
              No hidden setup fees. Choose the plan that fits your café needs.
            </p>

            {/* Toggle switch */}
            <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs shadow-sm">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-5 py-2 rounded-full font-semibold transition-all ${
                  !isYearly ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-5 py-2 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                  isYearly ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual Billing <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
            {/* Card 1: Starter Free */}
            <div className="bg-[#1c1c1f] border border-zinc-800/80 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300">
              <div>
                {/* Rounded dark inset header box */}
                <div className="bg-[#28282b] rounded-2xl p-6 mb-8 border border-zinc-800/40">
                  <h3 className="text-2xl font-bold text-white mb-2">Starter Free</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                    Ideal for small kiosk trials & mini coffee bars.
                  </p>
                </div>

                {/* Price display */}
                <div className="flex items-baseline mb-6 px-1">
                  <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight">
                    ₹0
                  </span>
                  <span className="text-xs text-zinc-400 font-normal ml-2">/ month</span>
                </div>

                {/* CTA Button */}
                <Link
                  to="/register"
                  className="w-full py-3.5 rounded-full bg-[#262629] hover:bg-[#343438] text-white font-semibold text-xs text-center transition-all duration-200 block border border-zinc-700/50"
                >
                  Start Free Trial
                </Link>

                {/* Dashed divider */}
                <div className="my-8 border-b border-dashed border-zinc-800" />

                {/* Includes Header */}
                <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-5">
                  STARTER PLAN INCLUDES
                </div>

                {/* Features List */}
                <ul className="space-y-4 text-xs text-zinc-300">
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">Up to 5</strong> Tables</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">Digital Menu</strong> & QR Code</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span>Standard Order Dashboard</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">₹2</strong> Per-Order Fee</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span>Basic email support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">1 member</strong> seat</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Basic Pro (Off-White Card) */}
            <div className="bg-[#fafafa] text-zinc-900 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative transition-all duration-300 border-2 border-red-600/80">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                Most Popular
              </div>

              <div>
                {/* Rounded light inset header box */}
                <div className="bg-white rounded-2xl p-6 mb-8 border border-zinc-200/60 shadow-sm">
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">Basic Pro</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed font-normal">
                    Full digital menu, live KDS & inventory BOM.
                  </p>
                </div>

                {/* Price display */}
                <div className="flex items-baseline mb-6 px-1">
                  <span className="text-5xl sm:text-6xl font-extrabold text-zinc-900 tracking-tight">
                    ₹{isYearly ? '239' : '299'}
                  </span>
                  <span className="text-xs text-zinc-500 font-normal ml-2">/ month</span>
                </div>

                {/* CTA Button */}
                <Link
                  to="/register"
                  className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs text-center transition-all duration-200 block shadow-lg shadow-red-600/25"
                >
                  Start 14-Day Free Trial
                </Link>

                {/* Dashed divider */}
                <div className="my-8 border-b border-dashed border-zinc-300" />

                {/* Includes Header */}
                <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-5">
                  PRO PLAN INCLUDES
                </div>

                {/* Features List */}
                <ul className="space-y-4 text-xs text-zinc-700">
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#e4e4e7] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-600 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-zinc-900">Up to 15</strong> Tables</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#e4e4e7] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-600 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-zinc-900">Live Kitchen KDS</strong> Display</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#e4e4e7] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-600 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-zinc-900">Recipe BOM</strong> Inventory Deduction</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#e4e4e7] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-600 stroke-[3]" />
                    </div>
                    <span>Staff RBAC Roles</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#e4e4e7] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-600 stroke-[3]" />
                    </div>
                    <span>Priority email support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#e4e4e7] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-600 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-zinc-900">10 member</strong> seats</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Premium Growth */}
            <div className="bg-[#1c1c1f] border border-zinc-800/80 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300">
              <div>
                {/* Rounded dark inset header box */}
                <div className="bg-[#28282b] rounded-2xl p-6 mb-8 border border-zinc-800/40">
                  <h3 className="text-2xl font-bold text-white mb-2">Premium Growth</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                    For multi-location dining & busy restaurants.
                  </p>
                </div>

                {/* Price display */}
                <div className="flex items-baseline mb-6 px-1">
                  <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight">
                    ₹{isYearly ? '639' : '799'}
                  </span>
                  <span className="text-xs text-zinc-400 font-normal ml-2">/ month</span>
                </div>

                {/* CTA Button */}
                <Link
                  to="/register"
                  className="w-full py-3.5 rounded-full bg-[#262629] hover:bg-[#343438] text-white font-semibold text-xs text-center transition-all duration-200 block border border-zinc-700/50"
                >
                  Upgrade to Premium
                </Link>

                {/* Dashed divider */}
                <div className="my-8 border-b border-dashed border-zinc-800" />

                {/* Includes Header */}
                <div className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-5">
                  PREMIUM PLAN INCLUDES
                </div>

                {/* Features List */}
                <ul className="space-y-4 text-xs text-zinc-300">
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">Unlimited Tables</strong> & Menus</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">Advanced Financial</strong> Reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span>Supplier & Stock Purchase Log</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span>SSO & Staff Controls</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span>24/7 Priority Support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#2d2d30] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-zinc-400 stroke-[3]" />
                    </div>
                    <span><strong className="font-bold text-white">Unlimited member</strong> seats</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="py-24 px-4 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-3">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500 font-semibold">Everything you need to know about setting up CaféOS</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-xs text-slate-900 flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-red-600 transition-transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaqIndex === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 10. FINAL CTA WITH SPARKLES */}
      <section className="py-24 px-4 lg:px-8 text-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-black text-white">
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Instant Onboarding Setup
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Ready to run your café smarter?
          </h2>

          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Join 500+ independent cafés streamlining QR ordering, kitchen display systems, and financial ledgers today.
          </p>

          <div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 hover:scale-105 transition-all"
            >
              Start Free Trial Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
