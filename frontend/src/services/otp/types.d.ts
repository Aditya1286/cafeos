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
  // Proof that this device just completed a fresh OTP for this phone (about 30 minutes). Sent only
  // for a fresh DEFAULT-purpose verification, never for an already-verified phone. The order
  // request carries it so the server can issue a guest pass.
  deviceProof?: string;
}

// DEFAULT: ordering / registration. ACCOUNT: a fresh OTP for a sensitive account action.
// RECOVERY: a fresh OTP to find a lost order (never satisfied by an earlier ordering verification).
export type OtpPurpose = 'DEFAULT' | 'ACCOUNT' | 'RECOVERY';
