import React from 'react';
import { motion } from 'framer-motion';

export const BentoGrid: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className = '', children }) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
};

export const BentoGridItem: React.FC<{
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ className = '', title, description, header, icon, badge }) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`rounded-3xl group/bento hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 p-6 bg-white border border-slate-200 flex flex-col justify-between space-y-4 relative overflow-hidden ${className}`}
    >
      {/* Subtle glowing radial background on hover */}
      <div className="absolute -inset-px bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover/bento:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />

      {header && <div className="relative z-10">{header}</div>}

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">{icon}</div>
          {badge}
        </div>
        <div className="font-black text-slate-900 text-3xl sm:text-4xl tracking-tight pt-1">
          {title}
        </div>
        <div className="font-semibold text-slate-500 text-xs leading-relaxed">{description}</div>
      </div>
    </motion.div>
  );
};

export default BentoGrid;
