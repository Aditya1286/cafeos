
// src/services/otpService.ts
import { config } from '../config';

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5/otp';
const AUTH_KEY = config.msg91AuthKey || '';
const TEMPLATE_ID = config.msg91TemplateId || '';

interface OtpResult {
  success: boolean;
  code: string;
  message: string;
  // Only populated in mock mode (config.otpMode === 'mock') so staging/QA can
  // read the code back from the API instead of receiving a real SMS. Never
  // set when talking to the live MSG91 provider.
  debugOtp?: string;
}

const MOCK_OTP_TTL_MS = 5 * 60 * 1000;
const mockOtpStore = new Map<string, { code: string; expiresAt: number }>();

// Lets a later, separate request (e.g. account registration) confirm server-side that
// this phone actually completed OTP verification, instead of trusting the frontend to
// have gated the button. Short TTL so it only covers "finish the form you're on," and
// single-use (see consumeVerifiedPhone) so the same verification can't be replayed
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

function generateMockOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
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

/**
 * Sends an OTP to the given phone number via MSG91's OTP API.
 */
export async function sendOtp(phone: string): Promise<OtpResult> {
  const mobile = toMsg91Format(phone);
  if (!mobile) {
    return { success: false, code: 'INVALID_PHONE', message: 'Enter a valid phone number.' };
  }

  if (config.otpMode === 'mock') {
    const code = generateMockOtp();
    mockOtpStore.set(mobile, { code, expiresAt: Date.now() + MOCK_OTP_TTL_MS });
    console.log(`[otp:mock] ${mobile} -> ${code}`);
    return { success: true, code: 'OTP_SENT', message: 'OTP sent (staging mode).', debugOtp: code };
  }

  try {
    const url = `${MSG91_BASE_URL}?template_id=${TEMPLATE_ID}&mobile=${mobile}&authkey=${AUTH_KEY}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await response.json();

    if (data.type === 'success') {
      return { success: true, code: 'OTP_SENT', message: 'OTP sent successfully.' };
    }

    return mapMsg91Error(data.message, 'send');
  } catch (error: any) {
    console.error('MSG91 send error:', error);
    return { success: false, code: 'SERVER_ERROR', message: 'Could not send OTP. Please try again.' };
  }
}

/**
 * Verifies an OTP code entered by the user for the given phone number.
 */
export async function verifyOtp(phone: string, otpCode: string): Promise<OtpResult> {
  const mobile = toMsg91Format(phone);
  if (!mobile) {
    return { success: false, code: 'INVALID_PHONE', message: 'Enter a valid phone number.' };
  }
  if (!otpCode || otpCode.trim().length === 0) {
    return { success: false, code: 'INVALID_OTP', message: 'OTP code is required.' };
  }

  if (config.otpMode === 'mock') {
    const entry = mockOtpStore.get(mobile);
    if (!entry) {
      return { success: false, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
    }
    if (Date.now() > entry.expiresAt) {
      mockOtpStore.delete(mobile);
      return { success: false, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
    }
    if (entry.code !== otpCode.trim()) {
      return { success: false, code: 'OTP_MISMATCH', message: 'Incorrect OTP. Please try again.' };
    }
    mockOtpStore.delete(mobile);
    markPhoneVerified(mobile);
    return { success: true, code: 'OTP_VERIFIED', message: 'OTP verified successfully.' };
  }

  try {
    const url = `${MSG91_BASE_URL}/verify?mobile=${mobile}&otp=${encodeURIComponent(otpCode)}`;
    const response = await fetch(url, { method: 'GET', headers: { authkey: AUTH_KEY } });
    const data = await response.json();

    if (data.type === 'success') {
      markPhoneVerified(mobile);
      return { success: true, code: 'OTP_VERIFIED', message: 'OTP verified successfully.' };
    }

    return mapMsg91Error(data.message, 'verify');
  } catch (error: any) {
    return { success: false, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' };
  }
}

/**
 * Optionally resend an OTP (text or voice) if the user didn't receive it.
 */
export async function resendOtp(phone: string, via: 'text' | 'voice' = 'text'): Promise<OtpResult> {
  const mobile = toMsg91Format(phone);
  if (!mobile) {
    return { success: false, code: 'INVALID_PHONE', message: 'Enter a valid phone number.' };
  }

  if (config.otpMode === 'mock') {
    const code = generateMockOtp();
    mockOtpStore.set(mobile, { code, expiresAt: Date.now() + MOCK_OTP_TTL_MS });
    console.log(`[otp:mock] ${mobile} -> ${code}`);
    return { success: true, code: 'OTP_RESENT', message: 'OTP resent (staging mode).', debugOtp: code };
  }

  try {
    const url = `${MSG91_BASE_URL}/retry?mobile=${mobile}&retrytype=${via}`;
    const response = await fetch(url, { method: 'GET', headers: { authkey: AUTH_KEY } });
    const data = await response.json();

    if (data.type === 'success') {
      return { success: true, code: 'OTP_RESENT', message: 'OTP resent successfully.' };
    }

    return mapMsg91Error(data.message, 'send');
  } catch (error: any) {
    console.error('MSG91 resend error:', error);
    return { success: false, code: 'SERVER_ERROR', message: 'Could not resend OTP. Please try again.' };
  }
}

/**
 * MSG91 returns free-text error messages rather than stable error codes,
 * so we pattern-match the known ones and fall back to a generic message.
 */
function mapMsg91Error(rawMessage: string, stage: 'send' | 'verify'): OtpResult {
  const msg = (rawMessage || '').toLowerCase();

  if (msg.includes('already') && msg.includes('verified')) {
    return { success: false, code: 'ALREADY_VERIFIED', message: 'This number is already verified.' };
  }
  if (msg.includes('not match') || msg.includes('invalid otp')) {
    return { success: false, code: 'OTP_MISMATCH', message: 'Incorrect OTP. Please try again.' };
  }
  if (msg.includes('expired')) {
    return { success: false, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
  }
  if (msg.includes('limit') || msg.includes('max')) {
    return { success: false, code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' };
  }
  if (msg.includes('mobile') || msg.includes('number')) {
    return { success: false, code: 'INVALID_PHONE', message: 'Invalid phone number.' };
  }

  console.error(`MSG91 ${stage} error:`, rawMessage);
  return { success: false, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' };
}