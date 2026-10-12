import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { Navbar } from '@/organisms/marketing/Navbar';
import { Footer } from '@/organisms/marketing/Footer';
import { APP_NAME } from '../constants/app';
import { WhyChooseUs } from '@/organisms/marketing/WhyChooseUs';
import { DEMO_PATH, DEMO_MENU_PATH } from '@/constants/demo';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { ProductTour } from '@/organisms/marketing/ProductTour';
import { StatsStrip } from '@/organisms/marketing/StatsStrip';
import { PricingSection } from '@/organisms/marketing/PricingSection';
import { FaqSection } from '@/organisms/marketing/FaqSection';
import { PageMascot } from '@/mascot/PageMascot';

export const LandingPage: React.FC = () => {
  useScrollToHash();

  return (
    <div className="min-h-screen bg-page text-slate-900 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      {/* 2. HERO SECTION */}
      <section
        data-mascot-section="hero"
        className="relative pt-14 pb-12 px-4 lg:px-8 overflow-hidden bg-page border-b border-red-100"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-red-200/40 via-red-100/60 to-orange-100/40 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <span>2-week free trial · No app for guests</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">
            Serve faster. Earn more.{' '}
            <span className="relative inline-block text-red-600">
              Keep it all.
              <span className="absolute bottom-1 left-0 w-full h-2.5 bg-red-200 rounded-full -z-10" />
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Guests scan, order and pay from their phone. Your kitchen sees every order the moment
            it's placed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link
              to={DEMO_PATH}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/25 hover:scale-[1.02] transition-all"
            >
              Start 2-week free trial <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to={DEMO_MENU_PATH}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 font-extrabold text-sm hover:bg-slate-200/80 transition-all"
            >
              <Play className="w-4 h-4 text-red-600 fill-red-600" /> Try the live demo
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto text-left">
            {[
              { label: "Today's Sales", value: '₹42,850', tone: 'text-emerald-700' },
              { label: 'In Kitchen', value: '8 Preparing', tone: 'text-red-600' },
              { label: 'Tables Active', value: '12 / 18', tone: 'text-slate-900' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-slate-50 px-3 py-3 sm:px-4 rounded-2xl border border-slate-200"
              >
                <span className="text-[10px] text-slate-500 font-bold uppercase">{s.label}</span>
                <div className={`text-lg sm:text-2xl font-black mt-0.5 ${s.tone}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PROMISE BAR */}
      <section
        data-mascot-section="promise"
        className="py-8 bg-white/60 border-b border-red-100"
      >
        <ul className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-bold text-slate-700">
          {['No app for guests to download', 'No special hardware', '2-week free trial'].map(
            (item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" /> {item}
              </li>
            ),
          )}
        </ul>
      </section>

      <ProductTour />

      <StatsStrip />

      {/* 6. OLD WAY VS. NEW WAY */}
      <WhyChooseUs />

      <PricingSection />

      <FaqSection />

      {/* 10. FINAL CTA WITH SPARKLES */}
      <section
        data-mascot-section="final"
        className="py-24 px-4 lg:px-8 text-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-black text-white"
      >
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
            <Sparkles className="w-3.5 h-3.5" /> 2 weeks free
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Ready for fewer mistakes and more orders?
          </h2>

          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Start your free trial today. We'll call you and set up your menu and QR codes with you.
          </p>

          <div>
            <Link
              to={DEMO_PATH}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 hover:scale-105 transition-all"
            >
              Start 2-week free trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <PageMascot page="landing" />
    </div>
  );
};
