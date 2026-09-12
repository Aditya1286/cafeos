import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TenantManagementModalProps {
  tenant: { id: string; name: string; status: string } | null;
  onClose: () => void;
  onConfirm: (id: string, newStatus: string) => void;
}

export const TenantManagementModal: React.FC<TenantManagementModalProps> = ({
  tenant,
  onClose,
  onConfirm,
}) => {
  if (!tenant) return null;

  const isSuspending = tenant.status === 'ACTIVE';
  const targetStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isSuspending ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {isSuspending ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              {isSuspending ? 'Suspend Café Tenant Access?' : 'Reactivate Café Tenant Access?'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to change the status of{' '}
              <span className="font-bold text-slate-900">{tenant.name}</span> to{' '}
              <span className="font-bold">{targetStatus}</span>? This will take effect immediately across all QR orders and KDS terminals.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(tenant.id, targetStatus);
                onClose();
              }}
              className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow transition-all ${
                isSuspending ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Confirm {targetStatus}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TenantManagementModal;
