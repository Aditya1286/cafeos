import { Request, Response } from 'express';
import { config } from '../config';
import { isPhoneOrderVerified, sendOtp, verifyOtp, resendOtp, verifyWidgetAccessToken, OtpPurpose } from '../services/otp.service';

// 'ACCOUNT' asks for a fresh, single-use verification for a sensitive account action (password
// reset, email change); anything else is the normal order/registration verification.
const purposeOf = (req: Request): OtpPurpose => (req.body?.purpose === 'ACCOUNT' || req.query?.purpose === 'ACCOUNT' ? 'ACCOUNT' : 'DEFAULT');

const statusFor = (result: { success: boolean; code: string }) =>
  result.success ? 200 : result.code === 'RATE_LIMITED' ? 429 : 400;

// The verification records these handlers read/write live in Mongo, so any of them can throw.
const serverError = (res: Response, error: any) =>
  res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });

// Public: cheap, no external call — tells the frontend whether this phone already has a
// live order-verification window (skip straight to verified, no billed SMS), and which mode
// the backend is running in so it knows whether to use the mock REST flow or load the widget.
export const getOtpStatus = async (req: Request, res: Response) => {
  try {
    const phone = String(req.query.phone || req.body.phone || '');
    // An account action always needs a fresh OTP, so it's never "already verified".
    const verified = purposeOf(req) === 'ACCOUNT' ? false : await isPhoneOrderVerified(phone);
    return res.json({ success: true, verified, mode: config.otpMode });
  } catch (error: any) {
    return serverError(res, error);
  }
};

// Public: mock-mode only (config.otpMode === 'mock') — simulates the widget's send/verify
// round trip locally for local dev/debugging, without needing widget credentials or spending
// SMS credits. Disabled (returns MOCK_DISABLED) whenever otpMode is 'live'.
export const requestOtp = async (req: Request, res: Response) => {
  try {
    const result = await sendOtp(req.body.phone, purposeOf(req));
    return res.status(statusFor(result)).json(result);
  } catch (error: any) {
    return serverError(res, error);
  }
};

export const resendOtpRequest = async (req: Request, res: Response) => {
  try {
    const result = await resendOtp(req.body.phone, purposeOf(req));
    return res.status(statusFor(result)).json(result);
  } catch (error: any) {
    return serverError(res, error);
  }
};

export const confirmOtp = async (req: Request, res: Response) => {
  try {
    const result = await verifyOtp(req.body.phone, req.body.otp, purposeOf(req));
    return res.status(statusFor(result)).json(result);
  } catch (error: any) {
    return serverError(res, error);
  }
};

// Public: the one point where our backend still talks to MSG91 for live OTP — validates the
// JWT the widget handed the frontend after a successful client-side verify.
export const confirmWidgetToken = async (req: Request, res: Response) => {
  try {
    const result = await verifyWidgetAccessToken(req.body.phone, req.body.accessToken, purposeOf(req));
    return res.status(statusFor(result)).json(result);
  } catch (error: any) {
    return serverError(res, error);
  }
};
