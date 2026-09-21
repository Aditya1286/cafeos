import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Check, X } from 'lucide-react';
import { APP_NAME } from '../constants/app';

export interface ComparisonFeature {
  oldWay: string;
  newWay: string;
}

const comparisonFeatures: ComparisonFeature[] = [
  {
    oldWay: 'Handwritten tickets causing kitchen errors & missing items',
    newWay: 'Live real-time Kitchen Display System (KDS)',
  },
  {
    oldWay: 'End-of-day manual cash and payment reconciliation headaches',
    newWay: 'Double-entry automated ledger with 3% commission transparency',
  },
  {
    oldWay: 'Guests waiting 10 minutes for printed paper menus',
    newWay: 'Instant QR table ordering in under 45 seconds',
  },
  {
    oldWay: 'Spreadsheet inventory math with zero stock alerts',
    newWay: 'Automatic ingredient BOM stock deduction on completed orders',
  },
];

export const WhyChooseUs: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Section Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Why Businesses Choose {APP_NAME}
        </h2>
        <p className="text-sm sm:text-base text-slate-500 font-medium max-w-xl mx-auto">
          The old manual way vs. the modern automated platform
        </p>
      </motion.div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        {/* Left Card: The Old Way */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#f4f6f9] p-7 sm:p-8 rounded-[28px] border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow duration-300"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-200/80 text-slate-700 font-bold text-sm sm:text-base">
              <ShieldAlert className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <span>The Old Way</span>
            </div>

            <ul className="space-y-4 text-xs sm:text-sm text-slate-600 font-medium">
              {comparisonFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-red-500 font-bold text-base leading-none flex-shrink-0 mt-0.5">
                    ✕
                  </span>
                  <span className="leading-relaxed">{feature.oldWay}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Right Card: The new way */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -4 }}
          className="bg-white p-7 sm:p-8 rounded-[28px] border-2 border-red-500 shadow-2xl shadow-red-500/15 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
        >
          {/* Subtle accent glow gradient */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100 text-red-600 font-bold text-sm sm:text-base">
              <Zap className="w-5 h-5 text-red-500 fill-red-500/10 flex-shrink-0" />
              <span>The {APP_NAME} Way</span>
            </div>

            <ul className="space-y-4 text-xs sm:text-sm text-slate-900 font-semibold">
              {comparisonFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-bold">{feature.newWay}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
