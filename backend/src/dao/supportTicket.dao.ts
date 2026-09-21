import mongoose from 'mongoose';
import { SupportTicket, ISupportTicket, SupportTicketStatus } from '../models/SupportTicket';

// Pure data-access layer for SupportTicket — no validation or business rules here,
// that lives in ../services/support.service.ts.

export interface CreateTicketInput {
  businessId: mongoose.Types.ObjectId | string;
  raisedByType: 'CUSTOMER' | 'BUSINESS_OWNER';
  raisedByUserId?: mongoose.Types.ObjectId | string;
  contactName: string;
  contactPhone: string;
  orderId?: mongoose.Types.ObjectId | string;
  category: string;
  subCategory?: string;
  description: string;
  ticketNumber: string;
}

export const createTicket = (input: CreateTicketInput): Promise<ISupportTicket> => SupportTicket.create(input);

export const findTicketById = (id: string): Promise<ISupportTicket | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) return Promise.resolve(null);
  return SupportTicket.findById(id);
};

export const findTicketByNumberAndPhone = (
  ticketNumber: string,
  contactPhone: string
): Promise<ISupportTicket | null> => SupportTicket.findOne({ ticketNumber, contactPhone });

export interface ListTicketsFilters {
  businessId?: string;
  status?: string;
  category?: string;
  raisedByType?: string;
  q?: string; // matches ticketNumber, contactName, contactPhone
}

export interface ListTicketsResult {
  tickets: ISupportTicket[];
  total: number;
}

export const listTickets = async (
  filters: ListTicketsFilters,
  page: number,
  limit: number
): Promise<ListTicketsResult> => {
  const query: Record<string, any> = {};
  if (filters.businessId) query.businessId = filters.businessId;
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.raisedByType) query.raisedByType = filters.raisedByType;
  if (filters.q) {
    const regex = new RegExp(filters.q.trim(), 'i');
    query.$or = [{ ticketNumber: regex }, { contactName: regex }, { contactPhone: regex }];
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ priorityRank: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignedToUserId', 'name email')
      .populate('businessId', 'name slug'),
    SupportTicket.countDocuments(query)
  ]);

  return { tickets, total };
};

export const countByStatus = (status: SupportTicketStatus, businessId?: string): Promise<number> => {
  const query: Record<string, any> = { status };
  if (businessId) query.businessId = businessId;
  return SupportTicket.countDocuments(query);
};

export const updateTicket = (id: string, patch: Partial<ISupportTicket>): Promise<ISupportTicket | null> =>
  SupportTicket.findByIdAndUpdate(id, patch, { new: true });
