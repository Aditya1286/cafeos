import { inputCls } from '@/molecules/FormField';

interface UpiSettingsProps {
  business: any;
  value: string;
  onChange: (value: string) => void;
  saving: boolean;
  onSave: () => void;
}

/** The UPI ID customers pay to when they choose "Online" at checkout. */
export const UpiSettings = ({ business, value, onChange, saving, onSave }: UpiSettingsProps) => (
  <div className="pt-4 border-t border-slate-100 space-y-2">
    <label className="text-[10px] font-extrabold uppercase text-slate-400">
      UPI ID (for customer online payments)
    </label>
    <p className="text-[11px] text-slate-400 font-medium">
      Shown to customers as a payment QR/link when they choose "Online" at checkout. Leave blank to
      only accept cash for now.
    </p>
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="yourbusiness@okhdfcbank"
        className={inputCls + ' flex-1'}
      />
      <button
        onClick={onSave}
        disabled={saving || value.trim() === (business?.upiVpa || '')}
        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all shrink-0"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
);
