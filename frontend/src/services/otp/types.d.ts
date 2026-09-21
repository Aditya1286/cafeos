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
