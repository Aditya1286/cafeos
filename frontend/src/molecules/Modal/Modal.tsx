import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

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
    className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full ${maxWidth} p-5 sm:p-6 space-y-5 my-8`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);

export default Modal;
