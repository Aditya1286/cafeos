import { ApiResponse } from '../../apiTypes';

export type SmepayOnboardingStatus = 'NOT_STARTED' | 'KYC_PENDING' | 'CONNECTED';

export interface CheckoutSettings {
  checkoutAllowed: boolean; // set by a super admin
  checkoutEnabled: boolean; // the owner's own switch
  checkoutAvailable: boolean; // both on — customers see the option
  partnerOnboardingAvailable: boolean; // "Create SMEPay account" is configured on the platform
  account: {
    onboardingStatus: SmepayOnboardingStatus;
    smepayBusinessId: string;
    kycUrl: string;
    clientId: string;
    hasClientSecret: boolean;
    credentialsVerifiedAt: string | null;
    lastError: string;
  };
}

export interface SaveCredentialsPayload {
  clientId: string;
  clientSecret: string;
}

export type CheckoutSettingsResponse = ApiResponse<CheckoutSettings>;
