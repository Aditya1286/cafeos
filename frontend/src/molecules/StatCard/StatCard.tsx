import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext: string;
  trend: string;
  color: string;
  iconBg: string;
  border: string;
}

export const StatCard = ({ icon: Icon, label, value, subtext, trend, color, iconBg, border }: StatCardProps) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={`bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border ${border} shadow-sm hover:shadow-md transition-all space-y-2 sm:space-y-3 relative overflow-hidden`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5 sm:mb-1 truncate">
          {label}
        </span>
        <div className={`text-lg sm:text-3xl font-black ${color} tracking-tight truncate`}>
          {value}
        </div>
      </div>

      <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${iconBg} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
      </div>
    </div>

    <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[9px] sm:text-[11px] font-bold text-slate-500">
      <span className="truncate">{subtext}</span>
      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[8px] sm:text-[10px] font-extrabold shrink-0">
        {trend}
      </span>
    </div>
  </motion.div>
);

export default StatCard;
