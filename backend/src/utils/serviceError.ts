import { Response } from 'express';

// Thrown for expected failure cases — the controller maps statusCode/code/message straight
// onto the standard {success:false, error:{code,message}} response shape used everywhere else.
export class ServiceError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Expected failures (ServiceError) map onto their own status/code; anything else falls back
// to a generic 500.
export const handleServiceError = (res: Response, error: any) => {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
  }
  return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
};
