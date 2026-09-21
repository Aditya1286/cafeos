
// src/services/otpService.ts
//
// Production OTP send + verify happens client-side via MSG91's OTP Widget (the browser talks
// to MSG91 directly, using a restricted widget token — never the account authkey); this
// service's job there is just to validate the resulting JWT server-side (verifyWidgetAccessToken)
// and own the "is this phone already verified" caches.
//
// In 'mock' mode (config.otpMode, default outside production) the widget is bypassed
// entirely — sendOtp/verifyOtp/resendOtp below simulate the whole flow locally and echo the
// code back in the response (debugOtp), so local dev/debugging works without widget
// credentials or spending any SMS credits.
import { config } from '../config';

const MSG91_VERIFY_TOKEN_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';
const AUTH_KEY = config.msg91AuthKey || '';

interface OtpResult {
  success: boolean;
  code: string;
  message: string;
  // Only populated in mock mode, so staging/QA can read the code back from the API instead
  // of needing widget credentials. Never set in live mode.
  debugOtp?: string;
}

/**
 * Converts a phone number to MSG91's expected format: country code + number,
 * no '+' prefix. Accepts E.164 (+919876543210) or bare 10-digit Indian numbers.
 */
function toMsg91Format(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

// Lets a later, separate request (e.g. account registration) confirm server-side that
// this phone actually completed OTP verification, instead of trusting the frontend to
// have gated the button. Short TTL so it only covers "finish the form you're on," and
// single-use (see clearVerifiedPhone) so the same verification can't be replayed
// across multiple registrations.
const VERIFIED_PHONE_TTL_MS = 15 * 60 * 1000;
const verifiedPhoneStore = new Map<string, number>(); // normalized mobile -> expiresAt

function markPhoneVerified(mobile: string) {
  verifiedPhoneStore.set(mobile, Date.now() + VERIFIED_PHONE_TTL_MS);
}

/** Read-only check — use to validate before doing other work (e.g. before hitting the DB). */
export function isPhoneVerified(phone: string): boolean {
  const mobile = toMsg91Format(phone);
  if (!mobile) return false;
  const expiresAt = verifiedPhoneStore.get(mobile);
  return !!expiresAt && Date.now() <= expiresAt;
}

/** Consumes the verification so it can't be reused. Call only once the action it was
 *  gating (e.g. registration) has actually succeeded. */
export function clearVerifiedPhone(phone: string): void {
  const mobile = toMsg91Format(phone);
  if (mobile) verifiedPhoneStore.delete(mobile);
}

// Separate from verifiedPhoneStore above: that one is short-lived and single-use because it
// gates account registration (a sensitive, one-time action). Placing an order is low-stakes
// and repeats constantly for the same guest, so it gets its own long-lived, reusable cache —
// verify once, then keep ordering without burning another billed SMS every time. Sliding:
// every successful order pushes the expiry forward, so an actively-ordering customer never
// re-verifies; one that goes quiet for a full week falls back to needing a fresh OTP.
const ORDER_VERIFIED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const orderVerifiedStore = new Map<string, number>(); // normalized mobile -> expiresAt

function markPhoneOrderVerified(mobile: string): void {
  orderVerifiedStore.set(mobile, Date.now() + ORDER_VERIFIED_TTL_MS);
}

/** Read-only check — call before creating an order, or before even loading the widget, to
 *  confirm this phone has a live order-verification window. */
export function isPhoneOrderVerified(phone: string): boolean {
  const mobile = toMsg91Format(phone);
  if (!mobile) return false;
  const expiresAt = orderVerifiedStore.get(mobile);
  return !!expiresAt && Date.now() <= expiresAt;
}

/** Call after an order is successfully placed to slide this phone's verification window forward. */
export function touchPhoneOrderVerification(phone: string): void {
  const mobile = toMsg91Format(phone);
  if (mobile) markPhoneOrderVerified(mobile);
}

// --- Mock/staging path -------------------------------------------------------------------
// Only reachable when config.otpMode === 'mock' — see the guard at the top of each function
// below. Mirrors the shape of the real flow (send -> code -> verify) entirely in memory, so
// the rest of the app (order gating, the long-lived cache above) gets exercised the same way
// it would against the real widget.
const MOCK_OTP_TTL_MS = 5 * 60 * 1000;
const mockOtpStore = new Map<string, { code: string; expiresAt: number }>();

function generateMockOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Mock-mode only. Simulates sending an OTP by generating a code and handing it straight back. */
export function sendOtp(phone: string): OtpResult {
  if (config.otpMode !== 'mock') {
    return { success: false, code: 'MOCK_DISABLED', message: 'Mock OTP mode is disabled; use the OTP widget.' };
  }
  const mobile = toMsg91Format(phone);
  if (!mobile) {
    return { success: false, code: 'INVALID_PHONE', message: 'Enter a valid phone number.' };
  }
  if (isPhoneOrderVerified(phone)) {
    return { success: true, code: 'ALREADY_VERIFIED', message: 'This phone is already verified.' };
  }

  const code = generateMockOtp();
  mockOtpStore.set(mobile, { code, expiresAt: Date.now() + MOCK_OTP_TTL_MS });
  console.log(`[otp:mock] ${mobile} -> ${code}`);
  return { success: true, code: 'OTP_SENT', message: 'OTP sent (staging mode).', debugOtp: code };
}

/** Mock-mode only. Alias of sendOtp, kept distinct so callers can label the UI action "resend". */
export function resendOtp(phone: string): OtpResult {
  return sendOtp(phone);
}

/** Mock-mode only. Verifies a code generated by sendOtp above. */
export function verifyOtp(phone: string, otpCode: string): OtpResult {
  if (config.otpMode !== 'mock') {
    return { success: false, code: 'MOCK_DISABLED', message: 'Mock OTP mode is disabled; use the OTP widget.' };
  }
  const mobile = toMsg91Format(phone);
  if (!mobile) {
    return { success: false, code: 'INVALID_PHONE', message: 'Enter a valid phone number.' };
  }
  if (!otpCode || !otpCode.trim()) {
    return { success: false, code: 'INVALID_OTP', message: 'OTP code is required.' };
  }

  const entry = mockOtpStore.get(mobile);
  if (!entry || Date.now() > entry.expiresAt) {
    mockOtpStore.delete(mobile);
    return { success: false, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
  }
  if (entry.code !== otpCode.trim()) {
    return { success: false, code: 'OTP_MISMATCH', message: 'Incorrect OTP. Please try again.' };
  }

  mockOtpStore.delete(mobile);
  markPhoneVerified(mobile);
  markPhoneOrderVerified(mobile);
  return { success: true, code: 'OTP_VERIFIED', message: 'OTP verified successfully.' };
}

/**
 * Validates the JWT access-token the MSG91 OTP Widget handed the frontend after a
 * successful client-side verify. This is the one point where our backend still talks to
 * MSG91 — with the real account authkey, server-side only — so a tampered or replayed token
 * can't be used to fake a verification.
 */
export async function verifyWidgetAccessToken(phone: string, accessToken: string): Promise<OtpResult> {
  const mobile = toMsg91Format(phone);
  if (!mobile) {
    return { success: false, code: 'INVALID_PHONE', message: 'Enter a valid phone number.' };
  }
  if (!accessToken || !accessToken.trim()) {
    return { success: false, code: 'INVALID_TOKEN', message: 'Missing verification token.' };
  }

  try {
    const response = await fetch(MSG91_VERIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authkey: AUTH_KEY, 'access-token': accessToken })
    });
    const data = await response.json();
    console.log(`[otp] MSG91 verifyAccessToken -> HTTP ${response.status}`, data);

    if (data.type === 'success') {
      markPhoneVerified(mobile);
      markPhoneOrderVerified(mobile);
      return { success: true, code: 'OTP_VERIFIED', message: 'OTP verified successfully.' };
    }

    console.error('MSG91 verifyAccessToken did not return success:', response.status, JSON.stringify(data));
    return { success: false, code: 'INVALID_TOKEN', message: 'Could not verify OTP. Please try again.' };
  } catch (error: any) {
    console.error('MSG91 widget token verify error:', error);
    return { success: false, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' };
  }
}
