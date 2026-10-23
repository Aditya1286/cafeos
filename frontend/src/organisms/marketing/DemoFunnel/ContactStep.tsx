import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { APP_NAME } from '@/constants/app';
import { DemoContact } from '@/hooks/useDemoFunnel';

interface ContactStepProps {
  contact: DemoContact;
  onChange: (patch: Partial<DemoContact>) => void;
  /** What the call will cover, built from their answers. */
  promises: string[];
  error: string;
  submitting: boolean;
  onSubmit: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all';
const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

/** The only typing in the flow, and it comes last: by now they have told us what they need. */
export const ContactStep: React.FC<ContactStepProps> = ({
  contact,
  onChange,
  promises,
  error,
  submitting,
  onSubmit,
  headingRef,
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
    className="space-y-5"
  >
    <div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl sm:text-2xl font-black tracking-tight leading-snug text-slate-900 outline-none"
      >
        Here’s what we’ll show you.
      </h2>
      <ul className="mt-3 space-y-2">
        {promises.map((text) => (
          <li key={text} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
            {text}
          </li>
        ))}
      </ul>
    </div>

    <div className="pt-4 border-t border-slate-100 space-y-4">
      <p className="text-sm font-bold text-slate-900">Where should we call you?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="demo-name">
            Your name
          </label>
          <input
            id="demo-name"
            data-mascot-field="demo-name"
            required
            maxLength={100}
            autoComplete="name"
            className={inputClass}
            value={contact.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Aditya Sharma"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="demo-brand">
            Café name
          </label>
          <input
            id="demo-brand"
            data-mascot-field="demo-brand"
            required
            maxLength={120}
            autoComplete="organization"
            className={inputClass}
            value={contact.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
            placeholder="The Artisan Roastery"
          />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="demo-phone">
          Mobile number
        </label>
        <div className="flex">
          <span className="px-3 flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-600 font-semibold">
            +91
          </span>
          <input
            id="demo-phone"
            data-mascot-field="demo-phone"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            className={`${inputClass} rounded-l-none`}
            value={contact.phone}
            onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, '') })}
            placeholder="98765 43210"
          />
        </div>
      </div>

      {/* Honeypot: off-screen, not focusable, ignored by people. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="demo-website">Website</label>
        <input
          id="demo-website"
          tabIndex={-1}
          autoComplete="off"
          value={contact.website}
          onChange={(e) => onChange({ website: e.target.value })}
        />
      </div>

      <label className="flex items-start gap-3 text-xs text-slate-600 font-medium cursor-pointer">
        <input
          type="checkbox"
          data-mascot-field="demo-consent"
          checked={contact.consent}
          onChange={(e) => onChange({ consent: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-red-600 shrink-0"
        />
        <span>
          I agree that {APP_NAME} can call or WhatsApp me about my free trial. Your details are only
          used for this, and never shared.
        </span>
      </label>
    </div>

    {error && (
      <p role="alert" className="text-xs font-semibold text-red-600">
        {error}
      </p>
    )}

    <div>
      <button
        type="submit"
        data-mascot-field="demo-submit"
        disabled={submitting}
        className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-base sm:text-sm shadow-lg shadow-red-600/25 transition-all active:scale-[0.99]"
      >
        {submitting ? 'Sending…' : 'Claim my 2 free weeks'}
      </button>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-semibold">
        <Lock className="w-3 h-3" /> No payment needed. We call you, you decide.
      </p>
    </div>
  </form>
);
