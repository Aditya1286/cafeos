import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Layers, Shield, Zap } from 'lucide-react';
import { CaosLogo } from '@/molecules/CaosLogo';
import { APP_NAME } from '@/constants/app';
import type { TourScreenId } from '@/constants/productTour';
import { ScaledStage } from '@/organisms/marketing/ProductTour/ScaledStage';
import { TOUR_SCREENS } from '@/organisms/marketing/ProductTour/screens';

// The login page's left panel. It shows the real product screens (the same recreations the landing
// page's tour uses) on a branded backdrop, instead of stock photos: everything is vector and
// self-hosted, so it is sharp at any size and loads nothing from a third party.

const STAGE_WIDTH = 760;
const STAGE_HEIGHT = 496;
const SLIDE_MS = 6000;

interface Slide {
  screen: TourScreenId;
  tag: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    screen: 'kitchen',
    tag: 'KITCHEN',
    title: 'Orders Go Straight to the Kitchen.',
    subtitle:
      'Every order shows up on your kitchen screen the moment it’s placed. No paper slips, no shouting.',
  },
  {
    screen: 'guest',
    tag: 'QR ORDERING',
    title: 'Customers Order From Their Phone.',
    subtitle: 'They scan the QR code on the table, pick their food, and pay. No app to download.',
  },
  {
    screen: 'numbers',
    tag: 'MONEY',
    title: 'Know Where Your Money Goes.',
    subtitle: 'See your sales, our fees and your stock in one place, all worked out for you.',
  },
];

/** Stage width: as wide as the panel allows, but short enough that the stage, the header and the
 * text below it all fit in the viewport height (34rem reserved for them, which also leaves room above the stage for the mascot to peek). */
const STAGE_STYLE: React.CSSProperties = {
  width: `clamp(340px, calc((100vh - 34rem) * ${STAGE_WIDTH / STAGE_HEIGHT}), 560px)`,
  maxWidth: '100%',
};

export const LoginShowcase: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const reduceMotion = useReducedMotion();

  // Auto-advance, unless the visitor prefers reduced motion (they can still use the dots).
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const slide = SLIDES[current];

  return (
    <div
      data-mascot-bounds="login"
      // Not `sticky`: that would make this panel its own stacking context and trap the stage card
      // (z-10) beneath the mascot it is meant to hide.
      className="hidden lg:flex lg:w-[54%] lg:min-h-screen relative flex-col justify-between p-12 overflow-hidden bg-slate-950"
    >
      {/* Backdrop: brand glows and a faint dot grid. Purely decorative. */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-red-600/30 blur-[130px]" />
        <div className="absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full bg-orange-400/15 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse at 50% 45%, black 25%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 25%, transparent 78%)',
          }}
        />
      </div>

      {/* Top header & status badge */}
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <CaosLogo className="w-11 h-11 rounded-2xl shadow-xl shadow-red-600/40 group-hover:scale-105 transition-transform duration-300" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">{APP_NAME}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-red-600/30 text-red-300 rounded-full border border-red-500/30 font-bold">
                LIVE
              </span>
            </div>
            <span className="text-xs text-slate-300 font-semibold block">
              Ordering & billing for cafés
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All systems working</span>
        </div>
      </div>

      {/* The stage: the real screens, cross-fading. It is also the card the mascot pops up from. */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-end py-4">
        <div className="relative" style={STAGE_STYLE}>
          <div
            data-mascot-peek="login-stage"
            className="relative z-10 rounded-3xl bg-white overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/15"
          >
            <ScaledStage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
              {/* Every screen stays mounted and only fades, so switching never reflows. */}
              {SLIDES.map((s, idx) => {
                const Screen = TOUR_SCREENS[s.screen];
                const visible = idx === current;
                return (
                  <div
                    key={s.screen}
                    aria-hidden={!visible}
                    className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
                      visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <Screen />
                  </div>
                );
              })}
            </ScaledStage>
          </div>

          {/* Two small "live" chips overlapping the stage's lower corners. Sample data. */}
          <motion.div
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute z-20 -left-5 bottom-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/15 shadow-xl text-white"
          >
            <span className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="text-[11px] font-bold leading-tight">
              Order ready
              <span className="block text-[10px] font-medium text-slate-400">Table 04</span>
            </span>
          </motion.div>
          <motion.div
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute z-20 -right-5 bottom-24 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/15 shadow-xl text-white"
          >
            <span className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-[11px] font-black">
              ₹
            </span>
            <span className="text-[11px] font-bold leading-tight">
              ₹420 paid
              <span className="block text-[10px] font-medium text-slate-400">via UPI</span>
            </span>
          </motion.div>
        </div>
        <p className="mt-3 text-[10px] text-slate-500 font-medium">
          Sample data shown. Your own menu and orders appear here.
        </p>
      </div>

      {/* Bottom: feature facts, the slide's text and its controls */}
      <div className="relative z-10 space-y-5 max-w-xl">
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white">
          <div className="text-left space-y-0.5">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-red-500" /> Orders reach kitchen
            </div>
            <div className="text-base font-black text-white">Instantly</div>
          </div>
          <div className="text-left space-y-0.5 border-x border-white/10 px-3">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Works on
            </div>
            <div className="text-base font-black text-white">Any phone</div>
          </div>
          <div className="text-left space-y-0.5 pl-1">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" /> Pricing
            </div>
            <div className="text-base font-black text-white">Flat monthly fee</div>
          </div>
        </div>

        <div className="space-y-2 text-left" aria-live="off">
          <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800/50 px-2.5 py-1 rounded-md inline-block">
            {slide.tag}
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight">{slide.title}</h2>
          <p className="text-slate-300 text-sm leading-relaxed font-medium">{slide.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {SLIDES.map((s, idx) => (
            <button
              key={s.screen}
              type="button"
              onClick={() => setCurrent(idx)}
              aria-label={`Show ${s.tag.toLowerCase()} slide`}
              aria-current={current === idx}
              className={`h-2 rounded-full transition-all duration-500 ${
                current === idx
                  ? 'w-10 bg-red-600 shadow-lg shadow-red-600/60'
                  : 'w-3 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginShowcase;
