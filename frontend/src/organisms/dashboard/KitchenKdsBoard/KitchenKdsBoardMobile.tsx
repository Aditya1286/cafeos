import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { STATUS_CONFIG, KDS_COLUMN_STATUSES } from '@/constants/orderStatus';
import { KdsColumn } from './KdsColumn';
import { KdsBoardViewProps, KdsStatus } from './types';

// Short label for the status switcher — STATUS_CONFIG's own labels ("Ready to Serve")
// are sized for a column header, not a 4-up segmented control on a phone.
const MOBILE_STATUS_LABEL: Record<KdsStatus, string> = {
  PLACED: 'New',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Cooking',
  READY: 'Ready',
};

const SWIPE_THRESHOLD_PX = 60;

/** Mobile (below `sm`): one status at a time instead of 4 stacked full-height columns — pick a
 * status from the switcher, or swipe left/right to step through the queue. Orders render as
 * compact tickets so a rush still fits on a few screens. The column uses natural page height;
 * nested scroll areas are awkward to hit on a phone. */
export const KitchenKdsBoardMobile = (props: KdsBoardViewProps) => {
  const { orders } = props;
  const [status, setStatus] = useState<KdsStatus>('PLACED');
  // Which way the switcher last moved, so the slide transition goes the matching direction.
  const [direction, setDirection] = useState(1);

  const statusIndex = KDS_COLUMN_STATUSES.indexOf(status);

  const goToStatus = (index: number) => {
    if (index < 0 || index >= KDS_COLUMN_STATUSES.length) return;
    setDirection(index > statusIndex ? 1 : -1);
    setStatus(KDS_COLUMN_STATUSES[index]);
  };

  const handleSwipeEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD_PX) goToStatus(statusIndex + 1);
    else if (info.offset.x >= SWIPE_THRESHOLD_PX) goToStatus(statusIndex - 1);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
        {KDS_COLUMN_STATUSES.map((s, i) => {
          const sc = STATUS_CONFIG[s];
          const count = orders.filter((o) => o.orderStatus === s).length;
          const active = s === status;
          return (
            <button
              key={s}
              onClick={() => goToStatus(i)}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all ${
                active ? 'bg-white shadow-sm' : 'hover:bg-white/60'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                <span
                  className={`text-[10px] font-black uppercase tracking-wide ${active ? sc.color : 'text-slate-400'}`}
                >
                  {MOBILE_STATUS_LABEL[s]}
                </span>
              </span>
              <span
                className={`text-[11px] font-mono font-bold ${active ? sc.color : 'text-slate-400'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Full width for the tickets: the status switcher above (and swiping) already moves
          between statuses, so no side arrows eating into a phone's width. */}
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={status}
            custom={direction}
            initial={{ x: direction > 0 ? 48 : -48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -48 : 48, opacity: 0 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleSwipeEnd}
          >
            <KdsColumn {...props} status={status} scrollable={false} compact />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KitchenKdsBoardMobile;
