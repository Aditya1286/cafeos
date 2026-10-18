import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  /** The sheet's content. It scrolls when it is taller than the screen allows. */
  children: ReactNode;
  /** Buttons that stay in view at the bottom while the content scrolls (for example "Apply"). */
  footer?: ReactNode;
}

/**
 * A panel that slides up from the bottom of a phone screen. It is never taller than 90% of the
 * visible screen (`dvh` follows the browser's toolbars): the title stays at the top, the content
 * scrolls in between, and the footer stays at the bottom, so nothing can end up off screen on a
 * short screen such as a phone held sideways. Tapping outside the sheet closes it.
 */
export const BottomSheet = ({ title, onClose, children, footer }: BottomSheetProps) => (
  <div
    className="fixed inset-0 z-50 flex items-end"
    style={{ background: 'rgba(15,23,42,0.6)' }}
    onClick={onClose}
  >
    <motion.div
      role="dialog"
      aria-label={title}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-h-[90dvh] flex flex-col bg-white rounded-t-3xl shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 space-y-4">
        {children}
      </div>

      {footer && (
        <div className="shrink-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100">
          {footer}
        </div>
      )}
    </motion.div>
  </div>
);
