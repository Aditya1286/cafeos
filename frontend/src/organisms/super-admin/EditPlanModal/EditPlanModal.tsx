import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import plansService from '@/services/superAdmin/plans';
import { toast } from '@/utils/toast';
import { SubscriptionPlan } from '@/types';

interface EditPlanModalProps {
  // Pass a plan to edit it, `null` to create a new one, `undefined` (closed) to hide the modal.
  plan: SubscriptionPlan | null | undefined;
  onClose: () => void;
  onSaved: () => void;
}

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold text-slate-600">{label}</label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50';

export const EditPlanModal = ({ plan, onClose, onSaved }: EditPlanModalProps) => {
  const isEditing = !!plan;
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState(0); // rupees
  const [annualPrice, setAnnualPrice] = useState(0);
  const [perOrderFee, setPerOrderFee] = useState(2);
  const [maxTables, setMaxTables] = useState(10);
  const [maxMenuItems, setMaxMenuItems] = useState(50);
  const [maxStaff, setMaxStaff] = useState(3);
  const [inventoryEnabled, setInventoryEnabled] = useState(false);
  const [analyticsAdvanced, setAnalyticsAdvanced] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setCode(plan.code);
      setDescription(plan.description || '');
      setMonthlyPrice((plan.monthlyPricePaise || 0) / 100);
      setAnnualPrice((plan.annualPricePaise || 0) / 100);
      setPerOrderFee((plan.perOrderFeePaise || 0) / 100);
      setMaxTables(plan.limits?.maxTables ?? 10);
      setMaxMenuItems(plan.limits?.maxMenuItems ?? 50);
      setMaxStaff(plan.limits?.maxStaff ?? 3);
      setInventoryEnabled(!!plan.limits?.inventoryEnabled);
      setAnalyticsAdvanced(!!plan.limits?.analyticsAdvanced);
      setIsPopular(!!plan.isPopular);
      setStatus(plan.status || 'ACTIVE');
    } else if (plan === null) {
      // Creating a new plan — reset to sane defaults.
      setName(''); setCode(''); setDescription('');
      setMonthlyPrice(0); setAnnualPrice(0); setPerOrderFee(2);
      setMaxTables(10); setMaxMenuItems(50); setMaxStaff(3);
      setInventoryEnabled(false); setAnalyticsAdvanced(false);
      setIsPopular(false); setStatus('ACTIVE');
    }
  }, [plan]);

  if (plan === undefined) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name,
        code,
        description,
        monthlyPricePaise: Math.round(monthlyPrice * 100),
        annualPricePaise: Math.round(annualPrice * 100),
        perOrderFeePaise: Math.round(perOrderFee * 100),
        limits: { maxTables, maxMenuItems, maxStaff, inventoryEnabled, analyticsAdvanced },
        isPopular,
        status
      };

      if (isEditing) {
        await plansService.update(plan!._id, body);
        toast.success('Plan updated');
      } else {
        await plansService.create(body);
        toast.success('Plan created');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">{isEditing ? `Edit ${plan!.name}` : 'Create Subscription Plan'}</h3>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Plan Name">
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Premium" />
              </FormField>
              <FormField label="Plan Code">
                <input
                  required
                  disabled={isEditing}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  className={`${inputCls} font-mono uppercase`}
                  placeholder="e.g. PREMIUM"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} placeholder="What this plan is for" />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Monthly Price (₹)">
                <input type="number" min={0} value={monthlyPrice} onChange={(e) => setMonthlyPrice(Number(e.target.value))} className={inputCls} />
              </FormField>
              <FormField label="Annual Price (₹)">
                <input type="number" min={0} value={annualPrice} onChange={(e) => setAnnualPrice(Number(e.target.value))} className={inputCls} />
              </FormField>
              <FormField label="Per-Order Fee (₹)">
                <input type="number" min={0} step="0.01" value={perOrderFee} onChange={(e) => setPerOrderFee(Number(e.target.value))} className={inputCls} />
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Max Tables">
                <input type="number" min={0} value={maxTables} onChange={(e) => setMaxTables(Number(e.target.value))} className={inputCls} />
              </FormField>
              <FormField label="Max Menu Items">
                <input type="number" min={0} value={maxMenuItems} onChange={(e) => setMaxMenuItems(Number(e.target.value))} className={inputCls} />
              </FormField>
              <FormField label="Max Staff">
                <input type="number" min={0} value={maxStaff} onChange={(e) => setMaxStaff(Number(e.target.value))} className={inputCls} />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={inventoryEnabled} onChange={(e) => setInventoryEnabled(e.target.checked)} className="accent-red-600" />
                Inventory tracking
              </label>
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={analyticsAdvanced} onChange={(e) => setAnalyticsAdvanced(e.target.checked)} className="accent-red-600" />
                Advanced analytics
              </label>
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} className="accent-red-600" />
                Mark as "Popular"
              </label>
            </div>

            <FormField label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'DISABLED')} className={inputCls}>
                <option value="ACTIVE">Active — visible &amp; assignable</option>
                <option value="DISABLED">Disabled — hidden from new assignment</option>
              </select>
            </FormField>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Plan'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditPlanModal;
