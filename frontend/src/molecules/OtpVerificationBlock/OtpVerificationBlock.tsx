import { CheckCircle2, Clock } from 'lucide-react';
import { useOtpVerification } from '@/hooks/useOtpVerification';
import { formatTime } from '@/utils/DateUtils';
import { inputCls } from '@/molecules/FormField';

interface OtpVerificationBlockProps {
  otp: ReturnType<typeof useOtpVerification>;
  /** Id for the MSG91 widget's bot-check (live mode) — must be unique on the page. */
  captchaContainerId: string;
  /** Where the code is going, as shown to the user, e.g. "your business number 98••••••34". */
  destinationLabel: string;
}

/**
 * Send → enter code → verify, for a phone number the parent already knows (it isn't typed here).
 * Drive it with a `useOtpVerification` result; gate the parent's submit on `otp.otpVerified`.
 */
export const OtpVerificationBlock = ({
  otp,
  captchaContainerId,
  destinationLabel,
}: OtpVerificationBlockProps) => {
  if (otp.otpVerified) {
    return (
      <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Verified — you can continue.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 font-medium">
          We'll send a one-time code to {destinationLabel}.
        </p>
        <button
          type="button"
          onClick={otp.sendOtp}
          disabled={otp.sending || !otp.canResend}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold whitespace-nowrap disabled:opacity-40 transition-all"
        >
          {otp.sending ? 'Sending…' : otp.otpSent ? 'Resend' : 'Send OTP'}
        </button>
      </div>

      {otp.otpSent && !otp.canResend && (
        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 tabular-nums">
          <Clock className="w-3.5 h-3.5" /> Resend available in {formatTime(otp.resendSecondsLeft)}
        </span>
      )}

      <div id={captchaContainerId} />

      {/* Staging only: the backend echoes the code instead of sending an SMS. */}
      {otp.devOtp && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-dashed border-amber-300">
          <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
            Staging test OTP
          </span>
          <span className="text-sm font-black text-amber-800 tracking-[0.2em]">{otp.devOtp}</span>
        </div>
      )}

      {otp.otpSent && (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter OTP"
            value={otp.otpCode}
            onChange={(e) => otp.setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={inputCls}
          />
          <button
            type="button"
            onClick={otp.verifyOtp}
            disabled={otp.verifying}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold whitespace-nowrap disabled:opacity-40 transition-all"
          >
            {otp.verifying ? 'Verifying…' : 'Verify'}
          </button>
        </div>
      )}

      {otp.error && <p className="text-[11px] font-bold text-rose-600">{otp.error}</p>}
    </div>
  );
};

export default OtpVerificationBlock;
