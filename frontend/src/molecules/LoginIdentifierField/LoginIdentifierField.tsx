import { Mail, Phone } from 'lucide-react';

export type LoginMethod = 'email' | 'phone';

interface LoginIdentifierFieldProps {
  method: LoginMethod;
  onMethodChange: (method: LoginMethod) => void;
  email: string;
  onEmailChange: (email: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
}

const inputCls =
  'w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all';

const METHODS: { id: LoginMethod; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone number' },
];

/**
 * "Who are you" half of the login form: an email, or a phone number (owners: the business number;
 * staff: the number their owner saved) — the password field below is the same for both.
 */
export const LoginIdentifierField = ({
  method,
  onMethodChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
}: LoginIdentifierFieldProps) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-xs font-extrabold text-slate-900">
        {method === 'email' ? 'Work Email Address' : 'Phone Number'}
      </label>
      <div
        role="tablist"
        aria-label="Sign in with"
        className="flex p-0.5 rounded-lg bg-slate-100 border border-slate-200"
      >
        {METHODS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={method === id}
            onClick={() => onMethodChange(id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all ${
              method === id
                ? 'bg-white text-red-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {method === 'email' ? (
      <div className="relative">
        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="owner@artisan.com"
          className={inputCls}
        />
      </div>
    ) : (
      <div className="relative">
        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="98765 43210"
          className={inputCls}
        />
      </div>
    )}
  </div>
);

export default LoginIdentifierField;
