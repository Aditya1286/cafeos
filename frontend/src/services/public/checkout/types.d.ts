import { ApiResponse } from '../../apiTypes';

// PENDING: waiting on the customer / SMEPay. FINALIZING: payment confirmed, order being created.
// PAID: order created (orderId). EXPIRED: unpaid past the hold window (a late payment still
// creates the order). SWITCHED: the customer chose cash / direct UPI instead (orderId).
export type CheckoutStatus = 'PENDING' | 'FINALIZING' | 'PAID' | 'EXPIRED' | 'SWITCHED';

export interface CheckoutSession {
  id: string;
  status: CheckoutStatus;
  businessSlug: string;
  amountPaise: number;
  expiresAt: string;
  orderId: string | null;
  paymentUrl: string | null;
  // SMEPay's own payment_status for the latest attempt (CREATED, PENDING, SUCCESS, FAILED, EXPIRED…)
  paymentStatus: string | null;
  attemptsLeft: number;
}

export interface StartCheckoutPayload {
  customerName: string;
  customerPhone: string;
  items: { productId: string; quantity: number; name: string }[];
  qrToken?: string;
  businessSlug?: string;
}

export type CheckoutResponse = ApiResponse<CheckoutSession>;
