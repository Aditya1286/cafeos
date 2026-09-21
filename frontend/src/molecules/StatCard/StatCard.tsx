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
    className={`bg-white p-5 rounded-3xl border ${border} shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden`}
  >
    <div className="flex items-start justify-between">
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
          {label}
        </span>
        <div className={`text-2xl sm:text-3xl font-black ${color} tracking-tight`}>
          {value}
        </div>
      </div>

      <div className={`w-11 h-11 rounded-2xl ${iconBg} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="w-5.5 h-5.5" />
      </div>
    </div>

    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
      <span className="truncate">{subtext}</span>
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold shrink-0">
        {trend}
      </span>
    </div>
  </motion.div>
);

export default StatCard;
