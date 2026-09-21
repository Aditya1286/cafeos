import { Order } from '../../../types';
import { ApiMessageResponse, ApiResponse } from '../../apiTypes';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  items: { productId: string; quantity: number; name: string }[];
  qrToken?: string;
  businessSlug?: string;
}

export type CreateOrderResponse = ApiResponse<Order>;
export type GetOrderResponse = ApiResponse<{ order: Order; business: any }>;
export type RequestRefundResponse = ApiMessageResponse;
export type MarkPaidResponse = ApiMessageResponse;
export type CancelOrderResponse = ApiMessageResponse;
