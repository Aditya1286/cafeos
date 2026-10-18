import { ReactNode, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface MenuSectionProps {
  title: string;
  count: number;
  subtitle?: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Set on a café category's section (not "Popular" or search results): the menu mascot's tips
   * watch `[data-category-id]` to tell which category is in view. */
  categoryId?: string;
  /** Set while the café's mascot is on: the section leaves room above its top bar for the mascot
   * to rise into, and (with `tipPeekId`) marks the top bar as the card it rises from. */
  mascot?: { room: boolean; tipPeekId?: string };
  children: ReactNode;
}

// A small gap above a category's top bar. The mascot rises into it and over the empty right-hand
// end of the previous category's last row, so the categories stay close together.
const MASCOT_ROOM = 'h-4';

/**
 * One collapsible block of the single-scroll menu: "Title (count)" with a chevron, and a
 * two-column grid of items beneath. The ref lets the menu jump sheet scroll straight to it.
 */
export const MenuSection = forwardRef<HTMLElement, MenuSectionProps>(
  ({ title, count, subtitle, collapsed, onToggle, categoryId, mascot, children }, ref) => (
    <section
      ref={ref}
      data-category-id={categoryId}
      className="border-b border-cafe-line last:border-b-0 scroll-mt-32"
    >
      {mascot?.room && <div aria-hidden="true" className={MASCOT_ROOM} />}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        // The mascot rises from behind this bar, so it must be opaque and above the mascot layer.
        data-mascot-peek={mascot?.tipPeekId}
        className={`w-full flex items-center justify-between gap-3 py-4 text-left ${
          mascot?.tipPeekId ? 'relative z-10 bg-cafe-page' : ''
        }`}
      >
        <span className="min-w-0">
          <span className="block text-lg font-black font-cafe-display text-cafe-ink leading-tight">
            {title} <span className="text-cafe-neutral-400 font-bold">({count})</span>
          </span>
          {subtitle && (
            <span className="block text-xs font-medium text-cafe-muted mt-1">{subtitle}</span>
          )}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-cafe-muted shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>
      {!collapsed && (
        <div className={`grid grid-cols-2 gap-x-3 gap-y-5 ${mascot?.room ? 'pb-3' : 'pb-6'}`}>
          {children}
        </div>
      )}
    </section>
  ),
);
MenuSection.displayName = 'MenuSection';

export default MenuSection;
