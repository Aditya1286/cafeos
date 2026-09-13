import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../../ui/EmptyState';

interface LiveOrdersPanelProps {
  liveOrders: any[];
}

export const LiveOrdersPanel = ({ liveOrders }: LiveOrdersPanelProps) => (
  <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        <h3 className="text-base font-extrabold text-slate-900">
          Live Orders
        </h3>
      </div>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        Real-Time Updates Active
      </span>
    </div>

    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
      {liveOrders.length === 0 ? (
        <EmptyState
          title="No live orders yet"
          description="New orders will stream in here in real time as customers check out."
        />
      ) : (
        <AnimatePresence initial={false}>
          {liveOrders.map((order) => (
            <motion.div
              key={order.id || order._id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>Order #{order.orderNumber || order._id?.toString().slice(-6)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">· {order.time || 'Just now'}</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {order.businessName || 'Unknown business'} · {order.itemsCount ?? 0} items
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="font-black text-slate-900">
                  ₹{order.total ?? 0}
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                  order.status === 'PREPARING'
                    ? 'bg-amber-100 text-amber-800'
                    : order.status === 'READY'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  </div>
);

export default LiveOrdersPanel;
