import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PagerBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Prev / Next with "Page 2 of 5" between. It stays at the bottom of the screen while the list
 * scrolls, so you never scroll to the end of a page of rows to reach it, and a page change takes
 * you back to the top of the new page. Renders nothing when there is only one page.
 */
export const PagerBar = ({ page, totalPages, onPageChange }: PagerBarProps) => {
  if (totalPages <= 1) return null;

  const goTo = (next: number) => {
    onPageChange(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="sticky bottom-0 z-20 -mx-4 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-page/95 backdrop-blur-sm border-t border-slate-200/70 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" /> Prev
      </button>
      <span className="text-[11px] font-bold text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 disabled:opacity-40"
      >
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
