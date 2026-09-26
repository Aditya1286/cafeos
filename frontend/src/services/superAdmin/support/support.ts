import { apiRequest } from '../../api';
import {
  AssignTicketResponse,
  EscalateTicketResponse,
  ListAgentsResponse,
  ListTicketsResponse,
  ResolveTicketResponse,
  TicketListQuery,
  ToggleAvailabilityResponse,
} from './types';

const buildQuery = <T extends object>(params: T): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.toString();
};

export const listTickets = (query: TicketListQuery): Promise<ListTicketsResponse> =>
  apiRequest(`/admin/support/tickets?${buildQuery(query)}`);

export const listAgents = (): Promise<ListAgentsResponse> => apiRequest('/admin/support/agents');

export const assignToSelf = (ticketId: string): Promise<AssignTicketResponse> =>
  apiRequest(`/admin/support/tickets/${ticketId}/assign`, 'PUT');

export const escalate = (ticketId: string): Promise<EscalateTicketResponse> =>
  apiRequest(`/admin/support/tickets/${ticketId}/escalate`, 'PUT');

export const resolve = (ticketId: string, resolutionNote: string): Promise<ResolveTicketResponse> =>
  apiRequest(`/admin/support/tickets/${ticketId}/resolve`, 'PUT', { resolutionNote });

export const toggleMyAvailability = (): Promise<ToggleAvailabilityResponse> =>
  apiRequest('/admin/support/agents/me/toggle-call-availability', 'PUT');
