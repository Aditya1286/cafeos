import React, { useEffect, useState } from 'react';
import { inputCls } from '@/molecules/FormField';
import { isValidGstinInput, normalizeGstin } from '@/constants/gst';

interface GstinFieldProps {
  /** The GSTIN currently saved for the business, if any. */
  value?: string;
  saving: boolean;
  /** Resolves true when saved; an empty string clears the GSTIN. */
  onSave: (gstin: string) => Promise<boolean>;
}

/** Seller GSTIN input for Settings. Optional: when set it is printed on the tax invoice. */
export const GstinField: React.FC<GstinFieldProps> = ({ value = '', saving, onSave }) => {
  const [input, setInput] = useState(value);

  // Follow the saved value (loaded after the page, or changed from elsewhere).
  useEffect(() => setInput(value), [value]);

  const normalized = normalizeGstin(input);
  const valid = isValidGstinInput(input);
  const unchanged = normalized === value;

  return (
    <div className="pt-4 border-t border-slate-100 space-y-2">
      <label
        htmlFor="settings-gstin"
        className="text-[10px] font-extrabold uppercase text-slate-400"
      >
        GSTIN (printed on your tax invoices)
      </label>
      <p className="text-[11px] text-slate-400 font-medium">
        Optional. If your business is registered for GST, add your 15-character GSTIN and it will
        appear on every bill you and your customers print. Leave blank if you don't have one.
      </p>
      <div className="flex gap-2">
        <input
          id="settings-gstin"
          type="text"
          value={input}
          maxLength={15}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="29ABCDE1234F1Z5"
          aria-invalid={!valid}
          className={`${inputCls} flex-1 font-mono tracking-wider ${valid ? '' : 'border-rose-400'}`}
        />
        <button
          onClick={() => onSave(normalized)}
          disabled={saving || unchanged || !valid}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all shrink-0"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {!valid && (
        <p role="alert" className="text-[11px] font-bold text-rose-600">
          A GSTIN has 15 characters, like 29ABCDE1234F1Z5.
        </p>
      )}
    </div>
  );
};

export default GstinField;
