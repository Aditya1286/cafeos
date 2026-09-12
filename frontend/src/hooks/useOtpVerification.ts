import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

interface UseOtpVerificationResult {
  otpSent: boolean;
  otpCode: string;
  setOtpCode: (code: string) => void;
  otpVerified: boolean;
  sending: boolean;
  verifying: boolean;
  error: string | null;
  resendSecondsLeft: number;
  canResend: boolean;
  // Set only when the backend is running in staging/mock OTP mode (it echoes
  // the code back instead of sending a real SMS). Undefined in production,
  // where a real provider is wired up and the code never leaves the backend.
  devOtp: string | null;
  sendOtp: () => Promise<void>;
  verifyOtp: () => Promise<void>;
  reset: () => void;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Self-contained OTP verification flow. Point it at a phone number and it
 * handles send/verify/reset state and API calls — the form just reads
 * `otpVerified` before allowing submission.
 *
 * Usage:
 *   const otp = useOtpVerification(customerPhone);
 *   <button onClick={otp.sendOtp} disabled={otp.sending}>Send OTP</button>
 *   ...
 *   if (!otp.otpVerified) return; // gate submission
 */
export function useOtpVerification(phone: string): UseOtpVerificationResult {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const reset = useCallback(() => {
    setOtpSent(false);
    setOtpCode('');
    setOtpVerified(false);
    setError(null);
    setResendSecondsLeft(0);
    setDevOtp(null);
  }, []);

  // Countdown ticks every second while a cooldown is active.
  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setResendSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSecondsLeft > 0]);

  // If the phone number changes after verification, the verification no
  // longer applies — reset so a stale otpVerified can't slip through.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const sendOtp = useCallback(async () => {
    if (resendSecondsLeft > 0) return; // still cooling down, ignore extra clicks
    if (!PHONE_REGEX.test(phone.trim())) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await apiRequest('/public/otp/request', 'POST', { phone });
      if (res.success) {
        setOtpSent(true);
        setOtpCode('');
        setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
        setDevOtp(res.debugOtp || null);
      } else {
        setError('Could not send OTP. Please try again.');
      }
    } catch (err: any) {
      setError('Could not send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  }, [phone, resendSecondsLeft]);

  const verifyOtp = useCallback(async () => {
    if (!otpCode.trim()) {
      setError('Enter the OTP sent to your phone.');
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const res = await apiRequest('/public/otp/verify', 'POST', { phone, otp: otpCode });
      if (res.success) {
        setOtpVerified(true);
        setDevOtp(null);
      } else {
        setError(res.message || 'Incorrect OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [phone, otpCode]);

  return {
    otpSent,
    otpCode,
    setOtpCode,
    otpVerified,
    sending,
    verifying,
    error,
    resendSecondsLeft,
    canResend: resendSecondsLeft === 0,
    devOtp,
    sendOtp,
    verifyOtp,
    reset,
  };
}