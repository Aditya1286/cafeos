import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Gift, MonitorPlay, Coffee, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/organisms/marketing/Navbar';
import { Footer } from '@/organisms/marketing/Footer';
import { DemoFunnel } from '@/organisms/marketing/DemoFunnel';
import { APP_NAME } from '@/constants/app';
import { useDemoFunnel } from '@/hooks/useDemoFunnel';
import { PageMascot } from '@/mascot/PageMascot';

const BENEFITS = [
  {
    icon: Gift,
    title: '2 weeks free',
    short: '2 weeks free',
    body: 'Try it in your own café before you decide anything.',
  },
  {
    icon: MonitorPlay,
    title: 'A live walkthrough',
    short: 'Live walkthrough',
    body: 'See the real product working, not slides.',
  },
  {
    icon: Coffee,
    title: 'Set up around your café',
    short: 'We set it up',
    body: 'We go through your menu, your tables and how your team works.',
  },
];

export const RequestDemoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const funnel = useDemoFunnel(searchParams.get('plan') || undefined);

  // What the mascot reacts to (keys of DEMO_CONFIG.signals in mascot/config.ts): the submit's
  // outcome first, otherwise the step on screen.
  const mascotSignal = funnel.sent
    ? 'sent'
    : funnel.submitting
      ? 'submitting'
      : funnel.error
        ? 'error'
        : `step-${funnel.stepKey}`;

  // Phones: once the first answer is in, the page header steps aside so every question sits right
  // under the top bar, no scrolling. The header is there for the first question only.
  const inFlow = funnel.stepIndex > 0 || funnel.sent;

  // "You're in" replaces the form wherever the page was scrolled to; start it from the top.
  useEffect(() => {
    if (funnel.sent) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [funnel.sent]);

  return (
    <div className="min-h-screen bg-page text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main
        data-mascot-section="demo"
        className="flex-1 px-3 sm:px-4 lg:px-8 py-3 sm:py-5 md:py-16 lg:py-20"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-8 lg:gap-14 items-start">
          <div className={`md:col-span-2 space-y-2 md:space-y-8 ${inFlow ? 'hidden md:block' : ''}`}>
            <Link
              to="/"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home
            </Link>

            <div>
              <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] md:mb-4">
                See {APP_NAME} running in <span className="text-red-600">your café.</span>
              </h1>
              <p className="hidden md:block text-base text-slate-600 font-medium leading-relaxed">
                Seven quick taps about your café, and your 2-week free trial starts. We'll call you,
                show you the product, and set up your menu and QR codes with you.
              </p>
            </div>

            {/* Phones: the three promises as one row of chips (scrolls sideways rather than wrapping),
                so the first question sits high on the screen. */}
            <ul className="md:hidden flex gap-1.5 overflow-x-auto -mx-3 px-3 pb-0.5">
              {BENEFITS.map(({ icon: Icon, short }) => (
                <li
                  key={short}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold text-red-700"
                >
                  <Icon className="w-3 h-3" /> {short}
                </li>
              ))}
            </ul>

            <ul className="hidden md:block space-y-5">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{title}</p>
                    <p className="text-xs text-slate-600 font-medium">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* The mascot's stage (tablet and up): it moves across this as the questions go by.
                Decorative only; on phones the mascot sits in the slot at the top of the card. */}
            <div
              data-mascot-bounds="demo"
              aria-hidden="true"
              className="hidden md:block relative h-[260px] lg:h-[300px] rounded-3xl border border-red-100 bg-gradient-to-br from-red-50/80 via-white to-orange-50/60 overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage: 'radial-gradient(rgba(220,38,38,0.12) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />
            </div>
          </div>

          {/* From md up the mascot pops up from behind this card, so it must paint above the mascot
              layer (relative z-10, opaque). On phones it must not: the mascot's slot is inside it. */}
          <div
            data-mascot-peek="demo-form"
            className="md:col-span-3 md:relative md:z-10 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-3.5 sm:p-8 md:min-h-[540px]"
          >
            {/* Phones: the mascot's reserved spot, with its message beside it. Until it speaks, the
                line below shows through. */}
            <div
              data-mascot-slot="demo"
              className="md:hidden h-[64px] -mt-1 mb-1 flex items-center pl-[76px] text-xs font-semibold text-slate-500"
            >
              {funnel.sent ? null : 'I’m Caos. Seven taps, no typing till the end.'}
            </div>

            <DemoFunnel funnel={funnel} />
          </div>
        </div>
      </main>

      <Footer />

      <PageMascot page="demo" signal={mascotSignal} />
    </div>
  );
};
