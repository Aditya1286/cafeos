import React, { useEffect, useState } from 'react';
import { X, Wallet, AlertTriangle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import businessesService from '@/services/superAdmin/businesses';
import remittancesService from '@/services/superAdmin/remittances';
import { toast } from '@/utils/toast';
import RemittanceHistoryTable, { RemittancePeriod } from '@/molecules/RemittanceHistoryTable';

interface BusinessFinanceDrawerProps {
  businessId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

interface RemittanceSummary {
  business: { _id: string; name: string; slug: string; commissionRatePercentage: number; remittanceCycleDays: number; taxRatePercentage: number };
  cycleDays: number;
  periods: RemittancePeriod[];
  currentPeriod: {
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    ordersCount: number;
    grossAmountPaise: number;
    commissionOwedPaise: number;
  };
  totalUnpaidOwedPaise: number;
  overdueAmountPaise: number;
  overdueCount: number;
  nextDueDate: string | null;
}

export const BusinessFinanceDrawer: React.FC<BusinessFinanceDrawerProps> = ({ businessId, onClose, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<RemittanceSummary | null>(null);
  const [commissionInput, setCommissionInput] = useState('3');
  const [cycleInput, setCycleInput] = useState('7');
  const [taxInput, setTaxInput] = useState('0');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSummary = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await businessesService.getRemittanceSummary(businessId);
      setSummary(res.data);
      setCommissionInput(String(res.data.business.commissionRatePercentage ?? 3));
      setCycleInput(String(res.data.business.remittanceCycleDays ?? 7));
      setTaxInput(String(res.data.business.taxRatePercentage ?? 0));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load business finances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) fetchSummary();
    else setSummary(null);
  }, [businessId]);

  const handleSaveSettings = async () => {
    if (!businessId) return;
    setSavingSettings(true);
    try {
      await businessesService.updateFinanceSettings(businessId, {
        commissionRatePercentage: parseFloat(commissionInput),
        remittanceCycleDays: parseInt(cycleInput, 10),
        taxRatePercentage: parseFloat(taxInput)
      });
      toast.success('Finance settings updated');
      await fetchSummary();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update finance settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMarkPaid = async (period: RemittancePeriod) => {
    try {
      await remittancesService.pay(period._id);
      toast.success('Remittance marked as paid');
      await fetchSummary();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark remittance as paid');
    }
  };

  const handleUnmarkPaid = async (period: RemittancePeriod) => {
    try {
      await remittancesService.unpay(period._id);
      toast.success('Reverted to unpaid');
      await fetchSummary();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revert remittance');
    }
  };

  if (!businessId) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex justify-end"
        style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.25 }}
          className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {summary?.business.name || 'Business Finances'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">/c/{summary?.business.slug}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading || !summary ? (
              <div className="py-16 text-center text-xs text-slate-400 font-semibold">Loading finances…</div>
            ) : (
              <>
                {/* Summary tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Owed (Unpaid)</div>
                    <div className="text-lg font-black text-slate-900">₹{Math.round(summary.totalUnpaidOwedPaise / 100).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <div className="text-[10px] text-rose-500 font-bold uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </div>
                    <div className="text-lg font-black text-rose-700">₹{Math.round(summary.overdueAmountPaise / 100).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Next Due</div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {summary.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">This Period So Far</div>
                    <div className="text-sm font-extrabold text-emerald-600">₹{Math.round(summary.currentPeriod.commissionOwedPaise / 100).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Finance settings */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase">Finance Settings</h4>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Commission Rate (%)</span>
                      <input
                        id="commission-rate-input"
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={commissionInput}
                        onChange={(e) => setCommissionInput(e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Remittance Cycle (days)</span>
                      <input
                        id="remittance-cycle-input"
                        type="number"
                        min={1}
                        value={cycleInput}
                        onChange={(e) => setCycleInput(e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">GST / Tax Rate (%)</span>
                      <input
                        id="tax-rate-input"
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={taxInput}
                        onChange={(e) => setTaxInput(e.target.value)}
                        className="w-28 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none focus:border-slate-400"
                      />
                    </label>
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> {savingSettings ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Changes apply going forward — closed periods keep the rate they were billed at.
                  </p>
                </div>

                {/* Remittance history */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-3">Remittance History</h4>
                  <RemittanceHistoryTable periods={summary.periods} onMarkPaid={handleMarkPaid} onUnmarkPaid={handleUnmarkPaid} />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BusinessFinanceDrawer;
