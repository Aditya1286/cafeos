export interface CreateTicketPayload {
  category: string | null;
  subCategory: string | null;
  description: string;
}

export interface CreatePublicTicketPayload extends CreateTicketPayload {
  // Required — support.service.ts's raiseTicket rejects a public ticket with no valid
  // businessId, and it has no other way to identify which business the ticket is for.
  businessId: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
}

export interface CreateTicketResponse {
  success: boolean;
  data: { ticketNumber: string; [key: string]: any };
}

export interface CallAgentResponse {
  success: boolean;
  data: { name: string; phone: string };
}

export interface TrackTicketResponse {
  success: boolean;
  data: any;
}
