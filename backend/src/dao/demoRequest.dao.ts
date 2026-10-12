import mongoose from 'mongoose';
import { DemoRequest, IDemoRequest, DemoRequestStatus } from '../models/DemoRequest';

// Pure data-access layer for DemoRequest — validation and rules live in
// ../services/demoRequest.service.ts.

export interface CreateDemoRequestInput {
  name: string;
  brandName: string;
  phone: string;
  email?: string;
  city: string;
  businessType?: string;
  message?: string;
  interestedPlan?: string;
  consentToContact: boolean;
}

export const createDemoRequest = (input: CreateDemoRequestInput): Promise<IDemoRequest> => DemoRequest.create(input);

export const findRecentByPhone = (phone: string, since: Date): Promise<IDemoRequest | null> =>
  DemoRequest.findOne({ phone, createdAt: { $gte: since } });

export const findDemoRequestById = (id: string): Promise<IDemoRequest | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) return Promise.resolve(null);
  return DemoRequest.findById(id);
};

export interface ListDemoRequestsFilters {
  status?: string;
  q?: string; // matches name, brandName, phone, city, email
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listDemoRequests = async (
  filters: ListDemoRequestsFilters,
  page: number,
  limit: number
): Promise<{ requests: IDemoRequest[]; total: number }> => {
  const query: Record<string, any> = {};
  if (filters.status) query.status = filters.status;
  if (filters.q) {
    const regex = new RegExp(escapeRegex(filters.q.trim()), 'i');
    query.$or = [{ name: regex }, { brandName: regex }, { phone: regex }, { city: regex }, { email: regex }];
  }

  const [requests, total] = await Promise.all([
    DemoRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DemoRequest.countDocuments(query)
  ]);
  return { requests, total };
};

export const countByStatus = (status: DemoRequestStatus): Promise<number> => DemoRequest.countDocuments({ status });

export const updateDemoRequest = (id: string, patch: Partial<IDemoRequest>): Promise<IDemoRequest | null> =>
  DemoRequest.findByIdAndUpdate(id, patch, { new: true });
