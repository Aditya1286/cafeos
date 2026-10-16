import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PLANS, EVERY_PLAN } from '@/constants/pricing';
import { PricingCard } from './PricingCard';

export const PricingSection: React.FC = () => (
  <section
    id="pricing"
    className="scroll-mt-20 py-14 sm:py-24 bg-page text-slate-900 border-t border-slate-200/80"
  >
    <div className="max-w-6xl mx-auto px-4 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-14">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          One flat monthly fee.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-medium max-w-md mx-auto">
          Start free for 2 weeks. Pick the plan that fits, and keep it simple.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>

      <div className="mt-6 sm:mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase mb-4 text-center">
          Included in every plan
        </p>
        <ul className="flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-2.5 sm:gap-y-3 text-xs sm:text-sm text-slate-700 font-semibold">
          {EVERY_PLAN.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default PricingSection;
