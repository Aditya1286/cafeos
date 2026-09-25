import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';

export interface MenuJumpTarget {
  id: string;
  title: string;
  count: number;
}

interface MenuJumpSheetProps {
  targets: MenuJumpTarget[];
  onJump: (id: string) => void;
  /** Lifts the floating button above the cart bar while it's showing. */
  raised: boolean;
}

/**
 * The floating "MENU" button + its sheet: the whole menu scrolls as one page, so this is how a
 * customer skips straight to a section. Centred at the bottom so it never collides with the
 * support widget in the bottom-right corner.
 */
export const MenuJumpSheet = ({ targets, onJump, raised }: MenuJumpSheetProps) => {
  const [open, setOpen] = useState(false);
  if (targets.length < 2) return null; // nothing to jump between

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 h-11 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-900/40 active:scale-95 transition-all ${
          raised ? 'bottom-24' : 'bottom-5'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        Menu
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-5 pb-8 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between pb-3 mb-1 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Menu</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul>
              {targets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onJump(t.id);
                    }}
                    className="w-full flex items-center justify-between py-3.5 text-left text-sm font-bold text-slate-800 hover:text-orange-600 transition-colors"
                  >
                    <span className="truncate pr-3">{t.title}</span>
                    <span className="text-xs font-extrabold text-slate-400 tabular-nums">
                      {t.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuJumpSheet;
