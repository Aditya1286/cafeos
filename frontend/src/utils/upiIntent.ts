// src/utils/upiIntent.ts

interface UpiPaymentParams {
  payeeVpa: string;
  payeeName: string;
  amount: number; // rupees, not paise
  transactionRef: string; // your order ID
  note?: string;
}

type UpiApp = 'generic' | 'gpay' | 'phonepe' | 'paytm';

const SCHEME_PREFIX: Record<UpiApp, string> = {
  generic: 'upi://pay',
  gpay: 'tez://upi/pay',
  phonepe: 'phonepe://pay',
  paytm: 'paytmmp://pay',
};

export function buildUpiIntentUrl(params: UpiPaymentParams, app: UpiApp = 'generic'): string {
  const query = new URLSearchParams({
    pa: params.payeeVpa,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    tr: params.transactionRef,
    tn: params.note || `Payment for order ${params.transactionRef}`,
    cu: 'INR',
  });
  return `${SCHEME_PREFIX[app]}?${query.toString()}`;
}

/**
 * Opens the UPI app. On mobile, the OS intercepts the custom scheme and
 * launches the app directly — no navigation actually happens on the page.
 */
export function openUpiApp(params: UpiPaymentParams, app: UpiApp = 'generic'): void {
  window.location.href = buildUpiIntentUrl(params, app);
}
