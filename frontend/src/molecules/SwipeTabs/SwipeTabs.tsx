import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';

export interface SwipeTab {
  id: string;
  label: string;
  /** A small count shown beside the label (hidden when 0). */
  badge?: number;
}

/** `cafe` uses the guest pages' café theme colours; `dashboard` the owner dashboard's. */
export type SwipeTabsVariant = 'cafe' | 'dashboard';

interface SwipeTabsProps {
  tabs: SwipeTab[];
  active: string;
  onChange: (id: string) => void;
  /** The content of the active tab. */
  children: React.ReactNode;
  variant?: SwipeTabsVariant;
}

const SWIPE_THRESHOLD_PX = 60;
// Up to this many tabs share the bar's width equally; more would be too narrow to read, so the
// bar scrolls sideways instead and keeps the open tab in view.
const MAX_EQUAL_TABS = 4;

const STYLES: Record<
  SwipeTabsVariant,
  { bar: string; track: string; active: string; inactive: string; badge: string }
> = {
  cafe: {
    bar: 'bg-cafe-page/95',
    track: 'bg-cafe-raised',
    active: 'bg-cafe-surface text-cafe-ink shadow-sm',
    inactive: 'text-cafe-neutral-400 hover:bg-cafe-surface/60',
    badge: 'bg-cafe-accent-500 text-cafe-on-accent',
  },
  dashboard: {
    bar: 'bg-page/95',
    track: 'bg-slate-100',
    active: 'bg-white text-slate-900 shadow-sm',
    inactive: 'text-slate-400 hover:bg-white/60',
    badge: 'bg-brand-600 text-white',
  },
};

/**
 * A row of tabs with the active tab's content below it. Swiping the content left or right moves to
 * the next or previous tab, like the kitchen board on a phone. The tab bar sticks to the top while
 * the content scrolls (under the dashboard's own header, in the dashboard variant).
 */
export const SwipeTabs: React.FC<SwipeTabsProps> = ({
  tabs,
  active,
  onChange,
  children,
  variant = 'cafe',
}) => {
  const style = STYLES[variant];
  const scrolls = tabs.length > MAX_EQUAL_TABS;
  const tabButtons = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const headerHeight = useHeaderHeight();
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.id === active),
  );
  // Which way the tabs last moved, so the slide goes the matching direction.
  const [direction, setDirection] = React.useState(1);

  // In a scrolling bar, bring the open tab into view (also when it was changed by a swipe).
  React.useEffect(() => {
    if (scrolls) {
      tabButtons.current[active]?.scrollIntoView?.({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [active, scrolls]);

  const goTo = (next: number) => {
    if (next < 0 || next >= tabs.length || next === index) return;
    setDirection(next > index ? 1 : -1);
    onChange(tabs[next].id);
  };

  const handleSwipeEnd = (_: unknown, info: PanInfo) => {
    // A mostly-vertical drag is the page scrolling, not a swipe.
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
    if (info.offset.x <= -SWIPE_THRESHOLD_PX) goTo(index + 1);
    else if (info.offset.x >= SWIPE_THRESHOLD_PX) goTo(index - 1);
  };

  return (
    <div>
      <div
        role="tablist"
        className={`sticky z-20 -mx-4 px-4 py-2 backdrop-blur-sm ${style.bar}`}
        style={{ top: variant === 'dashboard' ? headerHeight : 0 }}
      >
        <div
          className={`gap-1.5 p-1.5 rounded-2xl ${style.track} ${
            scrolls ? 'flex overflow-x-auto [scrollbar-width:none]' : 'grid'
          }`}
          style={
            scrolls ? undefined : { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }
          }
        >
          {tabs.map((t, i) => {
            const isActive = t.id === tabs[index].id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabButtons.current[t.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => goTo(i)}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                  scrolls ? 'shrink-0 px-3.5 whitespace-nowrap' : 'px-1'
                } ${isActive ? style.active : style.inactive}`}
              >
                <span className="truncate">{t.label}</span>
                {!!t.badge && (
                  <span
                    className={`min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${style.badge}`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* clip, not hidden: hidden would make this a scroll container and break sticky children. */}
      <div className="overflow-x-clip pt-2">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={tabs[index].id}
            role="tabpanel"
            custom={direction}
            initial={{ x: direction > 0 ? 48 : -48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -48 : 48, opacity: 0 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleSwipeEnd}
            style={{ touchAction: 'pan-y' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SwipeTabs;
