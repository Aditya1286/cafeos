import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Settings2,
} from 'lucide-react';
import NumberTicker from '@/atoms/NumberTicker';
import { AdminBusinessSummary } from '@/types';
import { paiseToRupees, formatCurrency } from '@/utils/money';

interface BusinessSpotlightModalProps {
  business: AdminBusinessSummary | null;
  onClose: () => void;
  onOpenFinance: (id: string) => void;
  onOpenStatusModal: (business: { id: string; name: string; status: string }) => void;
}

/**
 * The full view a Business Radar cell opens into. Leads with whatever actually
 * needs doing (suspended / overdue) before the stat cascade, since that's the
 * reason someone clicked a flagged business in the first place — the numbers
 * below are context, not the headline.
 */
export const BusinessSpotlightModal = ({
  business,
  onClose,
  onOpenFinance,
  onOpenStatusModal,
}: BusinessSpotlightModalProps) => (
  <AnimatePresence>
    {business && (
      <motion.div
        key={business._id}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8"
        style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative h-28 sm:h-32 overflow-hidden">
            {business.coverImageUrl ? (
              <img src={business.coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-500 to-amber-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
          </div>

          <div className="relative px-7 sm:px-9 pb-8 -mt-12 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-end gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-2xl font-black text-white shadow-lg border-4 border-white overflow-hidden shrink-0">
                {business.logoUrl ? (
                  <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  business.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {business.name}
                </h2>
                <p className="text-xs text-slate-500 font-mono truncate">
                  /c/{business.slug} · {business.email}
                </p>
              </div>
            </motion.div>

            {/* Lead with what actually needs doing */}
            {business.status === 'SUSPENDED' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 flex items-start gap-2.5"
              >
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-slate-700">
                  This account is suspended — it can't take orders until reactivated.
                </p>
              </motion.div>
            )}
            {business.overdueAmountPaise > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700">
                  {formatCurrency(business.overdueAmountPaise)} in commission is overdue
                  {business.nextDueDate
                    ? ` (was due ${new Date(business.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`
                    : ''}
                  .
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.24 }}
              className="flex items-center gap-2 flex-wrap"
            >
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                  business.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {business.status === 'ACTIVE' ? (
                  <ShieldCheck className="w-3 h-3" />
                ) : (
                  <ShieldAlert className="w-3 h-3" />
                )}
                {business.status}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-[11px] font-extrabold border border-slate-200">
                {business.commissionRatePercentage ?? 3}% fee per order
              </span>
            </motion.div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  label: 'Total Sales',
                  value: paiseToRupees(business.lifetimeGMVPaise),
                  icon: TrendingUp,
                  delay: 0.3,
                  tone: 'text-slate-900',
                },
                {
                  label: 'Fees Owed',
                  value: paiseToRupees(business.totalCommissionOwedPaise),
                  icon: Wallet,
                  delay: 0.38,
                  tone: 'text-slate-900',
                },
                {
                  label: 'Overdue',
                  value: paiseToRupees(business.overdueAmountPaise),
                  icon: AlertTriangle,
                  delay: 0.46,
                  tone: business.overdueAmountPaise > 0 ? 'text-rose-600' : 'text-slate-900',
                },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stat.delay }}
                  className="p-2.5 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 min-w-0"
                >
                  <stat.icon className="w-3.5 h-3.5 text-slate-400 mb-1.5" />
                  <div className={`text-sm sm:text-base font-black truncate ${stat.tone}`}>
                    <NumberTicker value={stat.value} prefix="₹" delay={stat.delay} />
                  </div>
                  <div className="text-[9px] font-bold uppercase text-slate-400 mt-0.5 leading-tight">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.56 }}
              className="flex items-center gap-5 pt-5 border-t border-slate-100"
            >
              <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shrink-0">
                <QRCodeSVG value={`${window.location.origin}/c/${business.slug}`} size={72} />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <button
                  onClick={() => {
                    onOpenFinance(business._id);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-3.5 h-3.5" /> View Fee Payments
                </button>
                <button
                  onClick={() => {
                    onOpenStatusModal({
                      id: business._id,
                      name: business.name,
                      status: business.status,
                    });
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Manage Status
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default BusinessSpotlightModal;
