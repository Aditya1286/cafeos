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
  children: ReactNode;
}

/**
 * One collapsible block of the single-scroll menu: "Title (count)" with a chevron, and a
 * two-column grid of items beneath. The ref lets the menu jump sheet scroll straight to it.
 */
export const MenuSection = forwardRef<HTMLElement, MenuSectionProps>(
  ({ title, count, subtitle, collapsed, onToggle, categoryId, children }, ref) => (
    <section
      ref={ref}
      data-category-id={categoryId}
      className="border-b border-cafe-line last:border-b-0 scroll-mt-32">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between gap-3 py-5 text-left"
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
      {!collapsed && <div className="grid grid-cols-2 gap-x-3 gap-y-5 pb-6">{children}</div>}
    </section>
  ),
);
MenuSection.displayName = 'MenuSection';

export default MenuSection;
