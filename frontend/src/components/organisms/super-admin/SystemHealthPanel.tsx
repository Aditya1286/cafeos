import React from 'react';
import { motion } from 'framer-motion';
import { SystemHealth } from '../../../types';

interface SystemHealthPanelProps {
  systemHealth: SystemHealth | null;
}

export const SystemHealthPanel = ({ systemHealth }: SystemHealthPanelProps) => {
  const heapUsedMB = systemHealth?.memoryUsage?.heapUsedMB;
  const heapTotalMB = systemHealth?.memoryUsage?.heapTotalMB;
  const heapPct = heapUsedMB !== undefined && heapTotalMB ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0;

  const cards = [
    { label: 'System Status', value: systemHealth?.status ?? '—', sub: 'Reported by the API process itself', color: 'text-emerald-600' },
    {
      label: 'Node Process Uptime',
      value: systemHealth?.uptimeSeconds !== undefined ? `${Math.floor(systemHealth.uptimeSeconds / 60)}m` : '—',
      sub: 'Continuous execution since last restart',
      color: 'text-slate-900'
    },
    {
      label: 'Heap Memory Used',
      value: heapUsedMB !== undefined ? `${heapUsedMB} MB` : '—',
      sub: heapTotalMB !== undefined ? `of ${heapTotalMB} MB total` : 'Loading…',
      color: 'text-slate-900'
    },
    {
      label: 'Database State',
      value: systemHealth?.database ?? '—',
      sub: 'MongoDB connection state',
      color: 'text-blue-600'
    },
  ];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">
            Server & Database System Health
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Real-time Node.js runtime metrics and MongoDB connection state
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
          systemHealth?.status === 'HEALTHY'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          {systemHealth?.status === 'HEALTHY' ? '● HEALTHY' : 'Checking…'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div key={card.label} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs text-slate-400 font-bold uppercase">{card.label}</div>
            <div className={`text-xl font-extrabold ${card.color}`}>{card.value}</div>
            <div className="text-[11px] text-slate-400">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Heap Memory Usage</span>
          <span>{heapUsedMB !== undefined ? `${heapUsedMB} / ${heapTotalMB} MB` : 'Loading…'}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${heapPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPanel;
