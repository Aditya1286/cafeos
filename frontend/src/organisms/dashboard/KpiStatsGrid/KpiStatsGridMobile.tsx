import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { StatCard, StatCardProps } from '@/molecules/StatCard';

/** Mobile (below `sm`): a 2×2 grid behind an "Overview" toggle, so the tiles can be collapsed
 * to reclaim vertical space above the fold. */
export const KpiStatsGridMobile = ({ cards }: { cards: StatCardProps[] }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-1 pb-2"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Overview</span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
          {collapsed ? 'Show' : 'Hide'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2.5 [&>*:last-child:nth-child(odd)]:col-span-2">
              {cards.map((card) => <StatCard key={card.label} {...card} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KpiStatsGridMobile;
