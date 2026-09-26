import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { IUser } from '../models/User';
import { ISupportTicket, SupportTicketRaisedByType, PRIORITY_RANK } from '../models/SupportTicket';
import { isValidCategory, isValidSubCategory } from '../utils/supportCategories';
import { generateDailyTicketId } from '../utils/ticketSequence';
import * as ticketDao from '../dao/supportTicket.dao';
import * as callAgentDao from '../dao/callAgent.dao';
import { emitToAdminSupport } from '../websocket/socketManager';
import { ServiceError } from '../utils/serviceError';

// Re-exported so existing `import { ServiceError } from '../services/support.service'` keeps working.
export { ServiceError };

const summarizeTicket = (ticket: ISupportTicket) => ({
  id: ticket._id,
  ticketNumber: ticket.ticketNumber,
  businessId: ticket.businessId,
  raisedByType: ticket.raisedByType,
  category: ticket.category,
  subCategory: ticket.subCategory,
  status: ticket.status,
  priority: ticket.priority,
  createdAt: ticket.createdAt
});

interface RaiseTicketInput {
  businessId: string;
  raisedByType: SupportTicketRaisedByType;
  raisedByUserId?: string;
  contactName: string;
  contactPhone: string;
  orderId?: string;
  category: string;
  subCategory?: string;
  description: string;
}

const raiseTicket = async (input: RaiseTicketInput): Promise<ISupportTicket> => {
  const { businessId, raisedByType, contactName, contactPhone, category, subCategory, description } = input;

  if (!mongoose.Types.ObjectId.isValid(businessId)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'A valid business is required to raise a ticket.');
  }
  if (!contactName?.trim() || !contactPhone?.trim() || !description?.trim()) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Name, phone, and a description are required.');
  }
  if (!isValidCategory(raisedByType, category)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Please select a valid issue category.');
  }
  if (!isValidSubCategory(raisedByType, category, subCategory)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Please select a valid issue sub-category.');
  }

  const business = await Business.findById(businessId);
  if (!business) {
    throw new ServiceError(404, 'NOT_FOUND', 'Business not found.');
  }

  const ticketNumber = await generateDailyTicketId(businessId);

  const ticket = await ticketDao.createTicket({
    businessId,
    raisedByType,
    raisedByUserId: input.raisedByUserId,
    contactName: contactName.trim(),
    contactPhone: contactPhone.trim(),
    orderId: input.orderId,
    category,
    subCategory,
    description: description.trim(),
    ticketNumber
  });

  emitToAdminSupport('support_ticket:new', summarizeTicket(ticket));
  return ticket;
};

export const createCustomerTicket = (input: Omit<RaiseTicketInput, 'raisedByType' | 'raisedByUserId'>) =>
  raiseTicket({ ...input, raisedByType: 'CUSTOMER' });

export const createOwnerTicket = (
  input: Omit<RaiseTicketInput, 'raisedByType' | 'raisedByUserId' | 'businessId' | 'contactName' | 'contactPhone'>,
  user: IUser
) => {
  if (!user.businessId) {
    throw new ServiceError(400, 'BUSINESS_REQUIRED', 'Your account is not linked to a business.');
  }
  return raiseTicket({
    ...input,
    businessId: user.businessId.toString(),
    raisedByType: 'BUSINESS_OWNER',
    raisedByUserId: user._id.toString(),
    contactName: user.name,
    contactPhone: user.phone || ''
  });
};

export const getTicketStatusForCustomer = async (ticketNumber: string, contactPhone: string) => {
  const ticket = await ticketDao.findTicketByNumberAndPhone(ticketNumber, contactPhone);
  if (!ticket) {
    throw new ServiceError(404, 'NOT_FOUND', "We couldn't find a ticket with that number and phone.");
  }
  return {
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    category: ticket.category,
    subCategory: ticket.subCategory,
    resolutionNote: ticket.resolutionNote,
    createdAt: ticket.createdAt,
    resolvedAt: ticket.resolvedAt
  };
};

export interface ListTicketsParams {
  businessId?: string;
  status?: string;
  category?: string;
  raisedByType?: string;
  q?: string;
  page: number;
  limit: number;
}

export const listTicketsForAdmin = async (params: ListTicketsParams) => {
  const { page, limit, ...filters } = params;
  const [{ tickets, total }, openCount, escalatedCount] = await Promise.all([
    ticketDao.listTickets(filters, page, limit),
    ticketDao.countByStatus('OPEN'),
    ticketDao.countByStatus('ESCALATED')
  ]);
  return {
    tickets,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    // Platform-wide, independent of the current filters — used for the dashboard tab badge.
    needsAttentionCount: openCount + escalatedCount
  };
};

const requireTicket = async (id: string): Promise<ISupportTicket> => {
  const ticket = await ticketDao.findTicketById(id);
  if (!ticket) {
    throw new ServiceError(404, 'NOT_FOUND', 'Ticket not found.');
  }
  return ticket;
};

export const escalateTicket = async (id: string, byUserId: string) => {
  await requireTicket(id);
  const updated = await ticketDao.updateTicket(id, {
    status: 'ESCALATED',
    priority: 'URGENT',
    priorityRank: PRIORITY_RANK.URGENT,
    escalatedAt: new Date(),
    escalatedByUserId: byUserId as any
  });
  emitToAdminSupport('support_ticket:updated', summarizeTicket(updated!));
  return updated;
};

export const assignTicketToSelf = async (id: string, userId: string) => {
  const ticket = await requireTicket(id);
  const patch: Partial<ISupportTicket> = { assignedToUserId: userId as any };
  if (ticket.status === 'OPEN') {
    patch.status = 'IN_PROGRESS';
  }
  const updated = await ticketDao.updateTicket(id, patch);
  emitToAdminSupport('support_ticket:updated', summarizeTicket(updated!));
  return updated;
};

export const resolveTicket = async (id: string, resolutionNote: string) => {
  if (!resolutionNote?.trim()) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'A resolution note is required to resolve a ticket.');
  }
  await requireTicket(id);
  const updated = await ticketDao.updateTicket(id, {
    status: 'RESOLVED',
    resolutionNote: resolutionNote.trim(),
    resolvedAt: new Date()
  });
  emitToAdminSupport('support_ticket:updated', summarizeTicket(updated!));
  return updated;
};

export const listCallAgents = () => callAgentDao.listAgents();

export const pickAvailableCallAgent = async () => {
  const agents = await callAgentDao.findAvailableAgents();
  if (!agents.length) {
    throw new ServiceError(404, 'NO_AGENTS_AVAILABLE', "No one's free to take a call right now — please raise a ticket instead.");
  }
  const chosen = agents[Math.floor(Math.random() * agents.length)];
  return { name: chosen.name, phone: chosen.phone };
};

export const toggleMyCallAvailability = async (userId: string, current: boolean | undefined) => {
  // A pre-existing user document may not have this field set at all yet (Mongoose schema
  // defaults don't retroactively populate existing rows) — treat that the same as `true`,
  // matching findAvailableAgents' $ne: false semantics, so the toggle flips the state the
  // user actually sees rather than a stale/absent one.
  const effectiveCurrent = current !== false;
  const updated = await callAgentDao.setAgentAvailability(userId, !effectiveCurrent);
  if (!updated) {
    throw new ServiceError(404, 'NOT_FOUND', 'Agent not found.');
  }
  return updated;
};
