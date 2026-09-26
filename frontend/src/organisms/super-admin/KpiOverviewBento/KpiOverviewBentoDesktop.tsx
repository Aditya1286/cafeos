import React from 'react';
import BentoGrid, { BentoGridItem } from '@/atoms/BentoGrid';
import { KpiTile } from './types';

/** Desktop/tablet (`md`+): the full bento cards with descriptions. */
export const KpiOverviewBentoDesktop = ({ tiles }: { tiles: KpiTile[] }) => (
  <BentoGrid>
    {tiles.map((t) => (
      <BentoGridItem
        key={t.key}
        title={t.value}
        description={t.description}
        icon={t.icon}
        badge={t.badge}
      />
    ))}
  </BentoGrid>
);

export default KpiOverviewBentoDesktop;
