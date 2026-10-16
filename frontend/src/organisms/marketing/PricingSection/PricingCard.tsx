import React from 'react';
import { Link } from 'react-router-dom';
import { DEMO_PATH } from '@/constants/demo';
import type { PricingPlan } from '@/constants/pricing';
import { PricingFeatureList } from './PricingFeatureList';

export const PricingCard: React.FC<{ plan: PricingPlan }> = ({ plan }) => (
  <div
    data-mascot-target={plan.popular ? 'pricing-popular' : 'pricing-plan'}
    data-mascot-peek={plan.popular ? 'pricing' : 'pricing-essential'}
    className={`relative z-10 rounded-3xl p-6 sm:p-7 flex flex-col border ${
      plan.popular
        ? 'bg-red-50 border-red-300 shadow-xl shadow-red-600/10'
        : 'bg-white border-slate-200 shadow-sm'
    }`}
  >
    {plan.popular && (
      <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wider">
        Most popular
      </span>
    )}

    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>

    <div className="flex items-baseline mt-4 mb-3">
      <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">₹{plan.price}</span>
      <span className="text-sm text-slate-500 ml-1.5">/mo</span>
    </div>

    <p className="text-sm text-slate-600 leading-relaxed sm:min-h-[44px]">{plan.tagline}</p>

    <Link
      to={`${DEMO_PATH}?plan=${encodeURIComponent(plan.name)}`}
      className={`mt-6 w-full py-3 rounded-xl text-sm font-bold text-center transition-all border ${
        plan.popular
          ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white shadow-md shadow-red-600/20'
          : 'border-red-600 text-red-700 hover:bg-red-50'
      }`}
    >
      Start your free trial
    </Link>

    <div className="my-5 sm:my-6 border-t border-slate-200" />

    <p className="text-xs font-bold text-slate-800 mb-4">{plan.includesLabel}</p>
    <PricingFeatureList items={plan.items} />
  </div>
);
