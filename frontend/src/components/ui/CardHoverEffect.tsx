import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HoverEffectItem {
  title: string;
  description: string;
  badge?: string;
  metric?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const CardHoverEffect: React.FC<{
  items: HoverEffectItem[];
  className?: string;
}> = ({ items, className = '' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {items.map((item, idx) => (
        <div
          key={item.title}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={item.onClick}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-red-500/8 block rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>

          <div className="rounded-2xl h-full w-full p-5 bg-white border border-slate-200 group-hover:border-red-400 relative z-10 space-y-3 transition-all duration-200 shadow-sm group-hover:shadow-md">
            <div className="flex items-center justify-between">
              {item.icon && <div className="text-red-500">{item.icon}</div>}
              {item.badge && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold border border-red-200">
                  {item.badge}
                </span>
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>

            {item.metric && (
              <div className="pt-2 border-t border-slate-100 font-black text-slate-900 text-lg">
                {item.metric}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardHoverEffect;
