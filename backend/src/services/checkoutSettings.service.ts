// Setting up a business's optional SMEPay checkout. Two independent switches must both be on for
// customers to see it: Business.checkoutAllowed (a super admin's call) and Business.checkoutEnabled
// (the owner's, only possible once their SMEPay account is CONNECTED). Onboarding itself:
//
//   1. startOnboarding — creates the café's SMEPay merchant via the Partner API and stores the
//      KYC link (optional: a café that already has an SMEPay account can skip straight to 2).
//   2. saveCredentials — the owner pastes their Wizard client id/secret; they're verified
//      against SMEPay's auth endpoint before being stored (secret encrypted) as CONNECTED.
//   3. setCheckoutEnabled.
import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { IUser } from '../models/User';
import * as accountDao from '../dao/smepayAccount.dao';
import { ServiceError } from '../utils/serviceError';
import { encryptSecret } from '../utils/secretBox';
import { wizAuth, partnerCreateMerchant, isPartnerOnboardingConfigured } from './payments/smepay.client';
import { isCheckoutAvailable } from './checkout.service';

type Id = mongoose.Types.ObjectId | string;

const loadBusiness = async (businessId: Id) => {
  const business = mongoose.Types.ObjectId.isValid(businessId) ? await Business.findById(businessId) : null;
  if (!business) {
    throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
  }
  return business;
};

const requireAllowed = (business: { checkoutAllowed: boolean }) => {
  if (!business.checkoutAllowed) {
    throw new ServiceError(403, 'CHECKOUT_NOT_ALLOWED', 'Online checkout has not been enabled for your business yet. Please contact support.');
  }
};

export const getCheckoutSettings = async (businessId: Id) => {
  const business = await loadBusiness(businessId);
  const account = await accountDao.findAccountWithSecret(business._id);
  return {
    checkoutAllowed: business.checkoutAllowed,
    checkoutEnabled: business.checkoutEnabled,
    checkoutAvailable: isCheckoutAvailable(business),
    partnerOnboardingAvailable: isPartnerOnboardingConfigured(),
    account: {
      onboardingStatus: account?.onboardingStatus || 'NOT_STARTED',
      smepayBusinessId: account?.smepayBusinessId || '',
      kycUrl: account?.kycUrl || '',
      clientId: account?.clientId || '',
      hasClientSecret: !!account?.clientSecretEnc,
      credentialsVerifiedAt: account?.credentialsVerifiedAt || null,
      lastError: account?.lastError || ''
    }
  };
};

export const startOnboarding = async (businessId: Id, owner: IUser) => {
  const business = await loadBusiness(businessId);
  requireAllowed(business);

  // Idempotent: a second click shows the same KYC link rather than creating a second merchant.
  const existing = await accountDao.findAccountByBusinessId(business._id);
  if (!existing?.smepayBusinessId) {
    try {
      const merchant = await partnerCreateMerchant({
        name: owner.name,
        businessName: business.name,
        companyName: business.name,
        email: business.email || owner.email,
        mobile: business.phone || owner.phone || ''
      });
      await accountDao.upsertAccount(business._id, {
        smepayBusinessId: merchant.smepayBusinessId,
        kycUrl: merchant.kycUrl,
        // Don't downgrade a café that already connected its own existing account.
        onboardingStatus: existing?.onboardingStatus === 'CONNECTED' ? 'CONNECTED' : 'KYC_PENDING',
        lastError: ''
      });
    } catch (error: any) {
      if (error instanceof ServiceError && error.statusCode === 502) {
        await accountDao.upsertAccount(business._id, { lastError: error.message });
      }
      throw error;
    }
  }

  return getCheckoutSettings(business._id);
};

export const saveCredentials = async (businessId: Id, input: { clientId?: unknown; clientSecret?: unknown }) => {
  const business = await loadBusiness(businessId);
  requireAllowed(business);

  const clientId = typeof input.clientId === 'string' ? input.clientId.trim() : '';
  const clientSecret = typeof input.clientSecret === 'string' ? input.clientSecret.trim() : '';
  if (!clientId || !clientSecret) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Both the SMEPay Client ID and Client Secret are required.');
  }

  // Throws 400 SMEPAY_AUTH_FAILED for bad credentials — nothing is stored in that case.
  await wizAuth({ clientId, clientSecret }, { fresh: true });

  await accountDao.upsertAccount(business._id, {
    clientId,
    clientSecretEnc: encryptSecret(clientSecret),
    onboardingStatus: 'CONNECTED',
    credentialsVerifiedAt: new Date(),
    lastError: ''
  });
  return getCheckoutSettings(business._id);
};

export const setCheckoutEnabled = async (businessId: Id, enabled: unknown) => {
  if (typeof enabled !== 'boolean') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'enabled must be true or false.');
  }
  const business = await loadBusiness(businessId);

  if (enabled) {
    requireAllowed(business);
    const account = await accountDao.findAccountByBusinessId(business._id);
    if (account?.onboardingStatus !== 'CONNECTED') {
      throw new ServiceError(400, 'CHECKOUT_NOT_READY', 'Connect your SMEPay account (Client ID and Secret) before turning on online checkout.');
    }
  }

  business.checkoutEnabled = enabled;
  await business.save();
  return getCheckoutSettings(business._id);
};

// Super admin: whether this business may offer online checkout at all. Turning it off hides the
// option from customers immediately; the owner's own switch is left as-is for if it's re-allowed.
export const setCheckoutAllowed = async (businessId: Id, allowed: unknown) => {
  if (typeof allowed !== 'boolean') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'allowed must be true or false.');
  }
  const business = await loadBusiness(businessId);
  business.checkoutAllowed = allowed;
  await business.save();
  return getCheckoutSettings(business._id);
};
