import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Coffee, KeyRound } from 'lucide-react';
import authService from '../services/auth';
import { useOtpVerification } from '../hooks/useOtpVerification';
import { OtpVerificationBlock } from '@/molecules/OtpVerificationBlock';
import { APP_NAME } from '@/constants/app';
import { toast } from '@/utils/toast';

const MIN_PASSWORD_LENGTH = 8; // mirrors backend/src/utils/password.ts
const fieldCls =
  'w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all disabled:opacity-60';

/**
 * Owner "forgot password". The business phone number is the source of truth:
 *   1. email + business phone must match an owner account (the number on file is never shown),
 *   2. a fresh OTP goes to that phone,
 *   3. only then can a new password be set — and every existing login is signed out.
 */
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '').slice(-10);
  const otp = useOtpVerification(detailsConfirmed ? phoneDigits : '', 'reset-otp-captcha', {
    purpose: 'ACCOUNT',
  });

  const handleCheckDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.verifyPasswordResetDetails(email.trim(), phone.trim());
      setDetailsConfirmed(true);
    } catch (err: any) {
      toast.error(err.message || "Those details don't match our records.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.resetPassword(email.trim(), phone.trim(), newPassword);
      toast.success('Password reset. Log in with your new password.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Could not reset your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const passwordProblem =
    newPassword && newPassword.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : confirmPassword && confirmPassword !== newPassword
        ? "The two passwords don't match."
        : null;
  const canReset =
    otp.otpVerified && newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
            <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </span>
            {APP_NAME}
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-red-600" /> Reset your password
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            For business owners. We'll verify it's you with a code sent to your business phone
            number.
          </p>
        </div>

        {!detailsConfirmed ? (
          <form onSubmit={handleCheckDetails} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
                Login email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourcafe.com"
                className={fieldCls}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
                Business phone number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                className={fieldCls}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !email.trim() || phoneDigits.length !== 10}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs disabled:opacity-50 transition-all"
            >
              {submitting ? 'Checking…' : 'Continue'}
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Kitchen staff: ask your café owner to set a new password for you from their Staff tab.
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <OtpVerificationBlock
              otp={otp}
              captchaContainerId="reset-otp-captcha"
              destinationLabel={`+91 ${phoneDigits}`}
            />
            {otp.otpVerified && (
              <>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldCls}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldCls}
                />
                {passwordProblem && (
                  <p className="text-[11px] font-bold text-rose-600">{passwordProblem}</p>
                )}
              </>
            )}
            <button
              type="submit"
              disabled={!canReset || submitting}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs disabled:opacity-50 transition-all"
            >
              {submitting ? 'Resetting…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
