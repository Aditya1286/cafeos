// Thin HTTP client for SMEPay's Wizard Checkout + Partner (TSP) APIs — no business rules here,
// those live in ../checkout.service.ts and ../checkoutSettings.service.ts.
//
// Money crosses this boundary as rupees (SMEPay's format) and everywhere else in the codebase as
// integer paise, so every conversion happens in this file and nowhere else.
import { config } from '../../config';
import { ServiceError } from '../../utils/serviceError';

const REQUEST_TIMEOUT_MS = 10_000;
// Wizard tokens live 600s; refresh a minute early so an in-flight request never carries a
// token that expires mid-call.
const TOKEN_REFRESH_MARGIN_MS = 60_000;

export interface SmepayCredentials {
  clientId: string;
  clientSecret: string;
}

export interface WizardOrder {
  smepayOrderId: string;
  slug: string;
  paymentUrl: string;
}

export interface WizardValidation {
  valid: boolean;
  paymentStatus: string; // CREATED | INITIATED | PENDING | SUCCESS | FAILED | EXPIRED
}

const toRupeesString = (paise: number) => (Math.round(paise) / 100).toFixed(2);
const toRupeesNumber = (paise: number) => Math.round(paise) / 100;

// SMEPay's examples use a bare 10-digit Indian mobile; customers type +91/0-prefixed numbers too.
const toSmepayMobile = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const postJson = async (url: string, body: unknown, token?: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    const reason = err?.name === 'AbortError' ? 'timed out' : err?.message || 'network error';
    throw new ServiceError(502, 'PAYMENT_PROVIDER_ERROR', `Could not reach SMEPay (${reason}).`);
  } finally {
    clearTimeout(timer);
  }
};

const providerError = (what: string, status: number, data: any) =>
  new ServiceError(502, 'PAYMENT_PROVIDER_ERROR', data?.message || data?.error || `SMEPay ${what} failed (HTTP ${status}).`);

// ── Wizard Checkout ──────────────────────────────────────────────────────────

const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const cacheKey = (clientId: string) => `${config.smepayBaseUrl}|${clientId}`;

/**
 * Exchanges a café's client id/secret for a Wizard access token (cached per client id).
 * `fresh` bypasses the cache — used when verifying newly entered credentials, and to retry once
 * after SMEPay rejects a cached token. Bad credentials are a 400 SMEPAY_AUTH_FAILED (the
 * owner's input is wrong), not a 502.
 */
export const wizAuth = async (creds: SmepayCredentials, { fresh = false } = {}): Promise<string> => {
  const key = cacheKey(creds.clientId);
  const cached = tokenCache.get(key);
  if (!fresh && cached && cached.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return cached.token;
  }

  const { ok, status, data } = await postJson(`${config.smepayBaseUrl}/api/wiz/external/auth`, {
    client_id: creds.clientId,
    client_secret: creds.clientSecret
  });
  if (!ok || !data?.access_token) {
    tokenCache.delete(key);
    if (status >= 400 && status < 500) {
      throw new ServiceError(400, 'SMEPAY_AUTH_FAILED', data?.message || 'SMEPay rejected these credentials.');
    }
    throw providerError('authentication', status, data);
  }

  const ttlMs = (Number(data.expires_in) || 600) * 1000;
  tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + ttlMs });
  return data.access_token;
};

// Authenticated Wizard call; a 401 means the cached token went stale early — re-auth once.
const wizPost = async (creds: SmepayCredentials, path: string, body: unknown) => {
  let token = await wizAuth(creds);
  let result = await postJson(`${config.smepayBaseUrl}${path}`, body, token);
  if (result.status === 401) {
    token = await wizAuth(creds, { fresh: true });
    result = await postJson(`${config.smepayBaseUrl}${path}`, body, token);
  }
  return result;
};

export const wizCreateOrder = async (
  creds: SmepayCredentials,
  params: {
    ref: string;
    amountPaise: number;
    callbackUrl: string;
    customer: { name: string; phone: string; email?: string };
  }
): Promise<WizardOrder> => {
  const { ok, status, data } = await wizPost(creds, '/api/wiz/external/order/create', {
    client_id: creds.clientId,
    amount: toRupeesString(params.amountPaise),
    order_id: params.ref,
    callback_url: params.callbackUrl,
    customer_details: {
      name: params.customer.name,
      mobile: toSmepayMobile(params.customer.phone),
      ...(params.customer.email ? { email: params.customer.email } : {})
    }
  });
  if (!ok || data?.status === false || !data?.order_slug || !data?.payment_url) {
    throw providerError('order creation', status, data);
  }
  return {
    smepayOrderId: String(data.order_id || ''),
    slug: String(data.order_slug),
    paymentUrl: String(data.payment_url)
  };
};

/**
 * SMEPay's server-side payment check — the only thing this codebase trusts to say a checkout was
 * paid. `valid` is SMEPay's own verdict that the slug/amount pair matches a real order.
 */
export const wizValidate = async (
  creds: SmepayCredentials,
  params: { slug: string; amountPaise: number }
): Promise<WizardValidation> => {
  const { ok, status, data } = await wizPost(creds, '/api/wiz/external/order/validate', {
    client_id: creds.clientId,
    amount: toRupeesNumber(params.amountPaise),
    slug: params.slug
  });
  if (!ok) {
    throw providerError('payment validation', status, data);
  }
  return {
    valid: data?.valid === true,
    paymentStatus: String(data?.payment_status || '').toUpperCase()
  };
};

// ── Partner (TSP) onboarding ────────────────────────────────────────────────

export const isPartnerOnboardingConfigured = () => !!(config.smepayPartnerCode && config.smepayPartnerEmail);

const partnerAuth = async (): Promise<string> => {
  if (!isPartnerOnboardingConfigured()) {
    throw new ServiceError(503, 'PARTNER_ONBOARDING_UNAVAILABLE', 'SMEPay account creation is not configured on this platform yet.');
  }
  const { ok, status, data } = await postJson(`${config.smepayPartnerBaseUrl}/api/partner/merchants/tsp/auth`, {
    partner_code: config.smepayPartnerCode,
    email: config.smepayPartnerEmail
  });
  // The response shape isn't documented — accept the token wherever the other SMEPay APIs put it.
  const token = data?.access_token || data?.token || data?.data?.token || data?.data?.access_token;
  if (!ok || !token) {
    throw providerError('partner authentication', status, data);
  }
  return token;
};

export const partnerCreateMerchant = async (merchant: {
  name: string;
  businessName: string;
  companyName: string;
  email: string;
  mobile: string;
}): Promise<{ smepayBusinessId: string; kycUrl: string }> => {
  const token = await partnerAuth();
  const { ok, status, data } = await postJson(
    `${config.smepayPartnerBaseUrl}/api/partner/merchants/extended`,
    {
      name: merchant.name,
      business_name: merchant.businessName,
      company_name: merchant.companyName,
      email: merchant.email,
      mobile: toSmepayMobile(merchant.mobile)
    },
    token
  );
  if (!ok || !data?.business_id) {
    throw providerError('merchant creation', status, data);
  }
  return { smepayBusinessId: String(data.business_id), kycUrl: String(data.kyc_url || '') };
};
