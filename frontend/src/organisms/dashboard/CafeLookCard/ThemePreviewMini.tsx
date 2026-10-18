import { ComponentProps } from 'react';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { ThemePreview } from './ThemePreview';

// ThemePreview is a fixed 260 × 460 phone. Shown at this scale and cropped to the top of the menu
// (cover, café card, tagline, first dishes), it is small enough to stay on screen while choosing.
const SCALE = 0.55;
const FULL_WIDTH = 260;
const FULL_HEIGHT = 460;
const VISIBLE_HEIGHT = 150;
/** The Settings tabs' own sticky bar (SwipeTabs), which this sticks just below. */
const TABS_BAR_PX = 60;

/**
 * A small live preview that sticks to the top of the screen while the owner scrolls through the
 * choices, so a pick can be seen without scrolling down to the full preview and back. It sticks
 * under the dashboard header and the Settings tabs, and stays inside its parent card.
 */
export const ThemePreviewMini = (props: ComponentProps<typeof ThemePreview>) => {
  const headerHeight = useHeaderHeight();
  return (
    <div
      data-testid="preview-mini"
      className="sticky z-10 -mx-5 px-5 py-2 bg-white/95 backdrop-blur-sm border-y border-slate-100"
      style={{ top: headerHeight + TABS_BAR_PX }}
    >
      <div
        className="mx-auto overflow-hidden rounded-2xl"
        style={{ width: FULL_WIDTH * SCALE, height: VISIBLE_HEIGHT }}
      >
        <div
          style={{
            width: FULL_WIDTH,
            height: FULL_HEIGHT,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          <ThemePreview {...props} />
        </div>
      </div>
      <p className="text-center text-[10px] font-bold text-slate-400 mt-1">Live preview</p>
    </div>
  );
};
