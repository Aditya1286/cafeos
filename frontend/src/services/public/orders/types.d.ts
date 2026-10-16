import { Order } from '../../../types';
import { ApiMessageResponse, ApiResponse } from '../../apiTypes';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  items: { productId: string; quantity: number; name: string }[];
  qrToken?: string;
  businessSlug?: string;
  /** From the last fresh OTP on this device: lets the server issue a guest pass with the order. */
  deviceProof?: string;
}

/** The guest pass the server issues (or renews) with an order that came with proof. Absent otherwise. */
export interface GuestPassGrant {
  guestToken?: string;
  /** ISO timestamp. */
  guestTokenExpiresAt?: string;
}

export type CreateOrderResponse = ApiResponse<Order & GuestPassGrant>;
export type GetOrderResponse = ApiResponse<{ order: Order; business: any }>;
export type RequestRefundResponse = ApiMessageResponse;
export type MarkPaidResponse = ApiMessageResponse;
export type CancelOrderResponse = ApiMessageResponse;

/** One order a verified phone can get back: just enough to open its tracking page. */
export interface RecoverableOrder {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  tableName?: string;
  totalAmountPaise: number;
  createdAt: string;
}

/**
 * Either the table QR token they scanned or the café's slug, plus how the caller proves the number:
 * the phone (just OTP-verified, purpose 'RECOVERY'), or the session token an earlier verification
 * earned (then no phone is sent: the number is inside the token).
 */
export interface RecoverOrdersPayload {
  qrToken?: string;
  businessSlug?: string;
  customerPhone?: string;
  recoveryToken?: string;
}

/** Sent only after a fresh OTP: keeps "my orders" working on this device for 12 hours. */
export interface RecoverySessionGrant {
  token: string;
  /** ISO timestamp. */
  expiresAt: string;
}

export type RecoverOrdersResponse = ApiResponse<RecoverableOrder[]> & {
  session?: RecoverySessionGrant;
};
