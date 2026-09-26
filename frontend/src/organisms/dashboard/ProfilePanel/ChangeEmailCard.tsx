import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { inputCls } from '@/molecules/FormField';
import { OtpVerificationBlock } from '@/molecules/OtpVerificationBlock';
import { useOtpVerification } from '@/hooks/useOtpVerification';
import { AccountProfileState } from '@/hooks/useAccountProfile';

/**
 * Owner only. The business phone number is the source of truth for the account, so a new login
 * email is only accepted after a fresh OTP to that number.
 */
export const ChangeEmailCard = ({ account }: { account: AccountProfileState }) => {
  const businessPhone = (account.profile?.business?.phone || '').replace(/\D/g, '').slice(-10);
  const [newEmail, setNewEmail] = useState('');
  const otp = useOtpVerification(businessPhone, 'change-email-otp-captcha', { purpose: 'ACCOUNT' });

  if (!account.profile?.business?.phone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await account.changeEmail(newEmail.trim())) {
      setNewEmail('');
      otp.reset(); // the verification was used up by this change
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-3"
    >
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <Mail className="w-5 h-5 text-orange-500" />
        <h3 className="text-sm font-black text-slate-900">Change Login Email</h3>
      </div>
      <p className="text-[11px] text-slate-400">
        Currently <span className="font-bold text-slate-600">{account.profile.email}</span>.
      </p>
      <input
        type="email"
        placeholder="New email address"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        className={inputCls}
      />
      <OtpVerificationBlock
        otp={otp}
        captchaContainerId="change-email-otp-captcha"
        destinationLabel={`your business number ${account.profile.business.phoneMasked}`}
      />
      <button
        type="submit"
        disabled={!newEmail.trim() || !otp.otpVerified || account.busy === 'email'}
        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
      >
        {account.busy === 'email' ? 'Saving…' : 'Change Email'}
      </button>
    </form>
  );
};
