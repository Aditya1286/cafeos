import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as supportService from '../services/support.service';
import { ServiceError } from '../services/support.service';
import { findTicketById } from '../dao/supportTicket.dao';

// Every handler in this file follows the same {success, data?, message?, error:{code,message}}
// shape used throughout the rest of the controllers (see orderController.ts, tableController.ts).
// Expected failures are raised by the service layer as ServiceError and mapped here; anything
// else falls back to a generic 500.
const handleServiceError = (res: Response, error: any) => {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
  }
  return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
};

// ── Public (unauthenticated, consumer-facing) ──────────────────────────────

export const createTicketPublic = async (req: Request, res: Response) => {
  try {
    const { businessId, category, subCategory, description, customerName, customerPhone, orderId } = req.body;
    const ticket = await supportService.createCustomerTicket({
      businessId,
      contactName: customerName,
      contactPhone: customerPhone,
      orderId,
      category,
      subCategory,
      description
    });
    return res.status(201).json({
      success: true,
      data: { ticketNumber: ticket.ticketNumber, status: ticket.status },
      message: 'Ticket raised — our team will reach out to you soon.'
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const getTicketStatusPublic = async (req: Request, res: Response) => {
  try {
    const { ticketNumber } = req.params;
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Phone number is required.' } });
    }
    const status = await supportService.getTicketStatusForCustomer(ticketNumber, phone);
    return res.json({ success: true, data: status });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const getCallAgentPublic = async (_req: Request, res: Response) => {
  try {
    const agent = await supportService.pickAvailableCallAgent();
    return res.json({ success: true, data: agent });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// ── Authenticated business users (owner dashboard) ─────────────────────────

export const createTicketAsOwner = async (req: AuthRequest, res: Response) => {
  try {
    const { category, subCategory, description } = req.body;
    const ticket = await supportService.createOwnerTicket({ category, subCategory, description }, req.user!);
    return res.status(201).json({
      success: true,
      data: { ticketNumber: ticket.ticketNumber, status: ticket.status },
      message: 'Ticket raised — our team will reach out to you soon.'
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// ── Super Admin ──────────────────────────────────────────────────────────

export const listTicketsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const { businessId, status, category, raisedByType, q } = req.query;
    const result = await supportService.listTicketsForAdmin({
      businessId: businessId as string | undefined,
      status: status as string | undefined,
      category: category as string | undefined,
      raisedByType: raisedByType as string | undefined,
      q: q as string | undefined,
      page,
      limit
    });
    return res.json({
      success: true,
      data: result.tickets,
      pagination: result.pagination,
      meta: { needsAttentionCount: result.needsAttentionCount }
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const getTicketAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
    }
    return res.json({ success: true, data: ticket });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const escalateTicketAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await supportService.escalateTicket(req.params.id, req.user!._id.toString());
    return res.json({ success: true, data: ticket, message: 'Ticket escalated' });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const assignTicketAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await supportService.assignTicketToSelf(req.params.id, req.user!._id.toString());
    return res.json({ success: true, data: ticket, message: 'Ticket assigned to you' });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const resolveTicketAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await supportService.resolveTicket(req.params.id, req.body.resolutionNote);
    return res.json({ success: true, data: ticket, message: 'Ticket resolved' });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const listCallAgentsAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await supportService.listCallAgents();
    return res.json({
      success: true,
      // Same $ne:false semantics as findAvailableAgents — a document predating this field
      // reads as available, not unavailable, so the roster matches what call-routing actually does.
      data: agents.map((a) => ({ id: a._id, name: a.name, phone: a.phone, isAvailableForCalls: a.isAvailableForCalls !== false }))
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const toggleMyCallAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const updated = await supportService.toggleMyCallAvailability(user._id.toString(), user.isAvailableForCalls);
    return res.json({
      success: true,
      data: { isAvailableForCalls: updated.isAvailableForCalls },
      message: updated.isAvailableForCalls ? "You're now available for calls" : "You're now unavailable for calls"
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
