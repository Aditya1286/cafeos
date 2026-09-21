import { Request, Response } from 'express';
import { config } from '../config';
import { isPhoneOrderVerified, sendOtp, verifyOtp, resendOtp, verifyWidgetAccessToken } from '../services/otp.service';

const statusFor = (result: { success: boolean; code: string }) =>
  result.success ? 200 : result.code === 'RATE_LIMITED' ? 429 : 400;

// Public: cheap, no external call — tells the frontend whether this phone already has a
// live order-verification window (skip straight to verified, no billed SMS), and which mode
// the backend is running in so it knows whether to use the mock REST flow or load the widget.
export const getOtpStatus = async (req: Request, res: Response) => {
  const phone = String(req.query.phone || req.body.phone || '');
  return res.json({ success: true, verified: isPhoneOrderVerified(phone), mode: config.otpMode });
};

// Public: mock-mode only (config.otpMode === 'mock') — simulates the widget's send/verify
// round trip locally for local dev/debugging, without needing widget credentials or spending
// SMS credits. Disabled (returns MOCK_DISABLED) whenever otpMode is 'live'.
export const requestOtp = async (req: Request, res: Response) => {
  const result = sendOtp(req.body.phone);
  return res.status(statusFor(result)).json(result);
};

export const resendOtpRequest = async (req: Request, res: Response) => {
  const result = resendOtp(req.body.phone);
  return res.status(statusFor(result)).json(result);
};

export const confirmOtp = async (req: Request, res: Response) => {
  const result = verifyOtp(req.body.phone, req.body.otp);
  return res.status(statusFor(result)).json(result);
};

// Public: the one point where our backend still talks to MSG91 for live OTP — validates the
// JWT the widget handed the frontend after a successful client-side verify.
export const confirmWidgetToken = async (req: Request, res: Response) => {
  const result = await verifyWidgetAccessToken(req.body.phone, req.body.accessToken);
  return res.status(statusFor(result)).json(result);
};
