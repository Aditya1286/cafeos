import { ReactNode } from 'react';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';

/** Search and filters that stay at the top of the screen, just under the dashboard header, while the list scrolls. */
export const StickyBar = ({ children }: { children: ReactNode }) => {
  const top = useHeaderHeight();
  return (
    <div
      className="sticky z-30 -mx-4 px-4 py-2 bg-page/95 backdrop-blur-sm space-y-2"
      style={{ top }}
    >
      {children}
    </div>
  );
};
