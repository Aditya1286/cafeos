import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../services/api';
import { loadMsg91Widget, widgetSendOtp, widgetVerifyOtp } from '../services/msg91Widget';

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
  // Set only when the backend is running in mock mode (it echoes the code back instead of
  // sending it via the real MSG91 widget). Undefined in live mode, where the widget handles
  // delivery and the code never leaves MSG91.
  devOtp: string | null;
  sendOtp: () => Promise<void>;
  verifyOtp: () => Promise<void>;
  reset: () => void;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Self-contained OTP verification flow. In live mode this is backed by the MSG91 OTP Widget
 * (send + verify happen client-side, directly against MSG91 — our backend only checks the
 * resulting token). In mock mode (backend's config.otpMode, default outside production) it
 * talks to our own mock REST endpoints instead, so local dev works without widget credentials
 * or spending SMS credits — which mode to use comes from the backend (/otp/status), not a
 * frontend flag, so it can never drift from what the server will actually accept.
 *
 * Usage:
 *   const otp = useOtpVerification(customerPhone, 'otp-captcha-container');
 *   <button onClick={otp.sendOtp} disabled={otp.sending}>Send OTP</button>
 *   ...
 *   if (!otp.otpVerified) return; // gate submission
 *
 * `captchaContainerId`, if given, must be the id of an empty element already in the DOM —
 * the widget renders its own bot-check into it (live mode only).
 */
export function useOtpVerification(phone: string, captchaContainerId?: string): UseOtpVerificationResult {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const modeRef = useRef<'mock' | 'live'>('live');

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
    const trimmed = phone.trim();
    if (!PHONE_REGEX.test(trimmed)) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Skip sending anything entirely if this phone already has a live order-verification
      // window from a recent order — and learn which mode the backend wants us to use.
      const status = await apiRequest(`/public/otp/status?phone=${encodeURIComponent(trimmed)}`, 'GET');
      modeRef.current = status.mode === 'mock' ? 'mock' : 'live';
      if (status.verified) {
        setOtpVerified(true);
        setOtpSent(false);
        return;
      }

      if (modeRef.current === 'mock') {
        const res = await apiRequest('/public/otp/request', 'POST', { phone: trimmed });
        if (res.success) {
          setOtpSent(true);
          setOtpCode('');
          setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
          setDevOtp(res.debugOtp || null);
        } else {
          setError(res.message || 'Could not send OTP. Please try again.');
        }
        return;
      }

      await loadMsg91Widget(captchaContainerId);
      await widgetSendOtp(`91${trimmed}`);
      setOtpSent(true);
      setOtpCode('');
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err?.message || 'Could not send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  }, [phone, resendSecondsLeft, captchaContainerId]);

  const verifyOtp = useCallback(async () => {
    if (!otpCode.trim()) {
      setError('Enter the OTP sent to your phone.');
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      if (modeRef.current === 'mock') {
        const res = await apiRequest('/public/otp/verify', 'POST', { phone, otp: otpCode.trim() });
        if (res.success) {
          setOtpVerified(true);
          setDevOtp(null);
        } else {
          setError(res.message || 'Incorrect OTP. Please try again.');
        }
        return;
      }

      const data = await widgetVerifyOtp(otpCode.trim());
      const accessToken = data?.message || data?.accessToken || data?.token;
      if (!accessToken) {
        throw new Error('Verification failed. Please try again.');
      }

      const res = await apiRequest('/public/otp/confirm-token', 'POST', { phone, accessToken });
      if (res.success) {
        setOtpVerified(true);
      } else {
        setError(res.message || 'Incorrect OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Incorrect OTP. Please try again.');
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
