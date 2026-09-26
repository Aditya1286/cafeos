export interface OtpStatusResponse {
  success: boolean;
  verified: boolean;
  mode: 'mock' | 'live';
}

export interface OtpActionResponse {
  success: boolean;
  code: string;
  message: string;
  // Mock mode only — echoes the code back so staging/QA can read it without widget credentials.
  debugOtp?: string;
}

// DEFAULT: ordering / registration. ACCOUNT: a fresh OTP for a sensitive account action.
export type OtpPurpose = 'DEFAULT' | 'ACCOUNT';
