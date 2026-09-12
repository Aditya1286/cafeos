import { Request,Response } from 'express';
import { sendOtp, verifyOtp } from '../services/otp.service';

export const requestOtp = async (req: Request, res: Response) => {
  const result = await sendOtp(req.body.phone);
  return res.status(result.success ? 200 : 400).json(result);
};

export const confirmOtp = async (req: Request, res: Response) => {
  const result = await verifyOtp(req.body.phone, req.body.otp);
  return res.status(result.success ? 200 : 400).json(result);
};