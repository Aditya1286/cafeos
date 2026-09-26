import React from 'react';
import { StatCard, StatCardProps } from '@/molecules/StatCard';

/** Desktop/tablet (`sm`+): the full KPI grid, always visible. Sized for 3 or 4 cards (some
 * cards are feature-flagged) — with an odd count, the last card spans the 2-column tablet row. */
export const KpiStatsGridDesktop = ({ cards }: { cards: StatCardProps[] }) => (
  <div
    className={`grid grid-cols-2 gap-5 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1 ${
      cards.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'
    }`}
  >
    {cards.map((card) => (
      <StatCard key={card.label} {...card} />
    ))}
  </div>
);

export default KpiStatsGridDesktop;
