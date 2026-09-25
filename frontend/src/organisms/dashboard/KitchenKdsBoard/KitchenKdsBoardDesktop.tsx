import React from 'react';
import { KDS_COLUMN_STATUSES } from '@/constants/orderStatus';
import { KdsColumn } from './KdsColumn';
import { KdsBoardViewProps } from './types';

/** Desktop/tablet (`sm`+): every status column visible at once, each independently scrollable
 * so they can be compared side by side. */
export const KitchenKdsBoardDesktop = (props: KdsBoardViewProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
    {KDS_COLUMN_STATUSES.map(status => (
      <KdsColumn key={status} {...props} status={status} scrollable />
    ))}
  </div>
);

export default KitchenKdsBoardDesktop;
