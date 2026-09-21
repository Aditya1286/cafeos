import { apiRequest } from '../api';
import {
  CallAgentResponse,
  CreatePublicTicketPayload,
  CreateTicketPayload,
  CreateTicketResponse,
  TrackTicketResponse
} from './types';

// Authenticated (business owner raising a ticket against their own account).
export const createTicket = (payload: CreateTicketPayload): Promise<CreateTicketResponse> =>
  apiRequest('/support/tickets', 'POST', payload);

// Public (customer raising a ticket, no auth — identified by name/phone instead).
export const createPublicTicket = (payload: CreatePublicTicketPayload): Promise<CreateTicketResponse> =>
  apiRequest('/public/support/tickets', 'POST', payload);

export const callAgent = (): Promise<CallAgentResponse> =>
  apiRequest('/public/support/call-agent');

export const trackTicket = (ticketNumber: string, phone: string): Promise<TrackTicketResponse> =>
  apiRequest(
    `/public/support/tickets/${encodeURIComponent(ticketNumber)}/status?phone=${encodeURIComponent(phone)}`
  );
