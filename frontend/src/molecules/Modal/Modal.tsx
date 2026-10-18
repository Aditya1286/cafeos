import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * A dialog in the middle of the screen. The card is never taller than the screen: the title and the
 * close button stay at the top and the content scrolls inside the card. (A card that grew with its
 * content and was centred ran off both the top and the bottom of a short screen, and the part above
 * the top could not be scrolled to.)
 */
export const Modal = ({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`flex max-h-full w-full flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl ${maxWidth}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        {children}
      </div>
    </motion.div>
  </div>
);

export default Modal;
