import React from 'react';
import logo from '@/assets/caos-logo.png';
import { APP_NAME } from '@/constants/app';

/** The Caos mark: the hamster badge on its red tile. Size and corner radius come from `className`
 * (e.g. "w-10 h-10 rounded-xl"); it is square, so give it equal width and height. */
export const CaosLogo: React.FC<{ className?: string }> = ({
  className = 'w-10 h-10 rounded-xl',
}) => (
  <img
    src={logo}
    alt={APP_NAME}
    draggable={false}
    className={`shrink-0 object-cover ${className}`}
  />
);

export default CaosLogo;
