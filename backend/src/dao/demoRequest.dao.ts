import mongoose from 'mongoose';
import {
  DemoRequest,
  IDemoRequest,
  DemoRequestStatus,
  IDemoRequestAnswer,
  IDemoRequestSource
} from '../models/DemoRequest';

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
  answers: IDemoRequestAnswer[];
  source?: IDemoRequestSource;
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

export const countCreatedBetween = (from: Date, to: Date): Promise<number> =>
  DemoRequest.countDocuments({ createdAt: { $gte: from, $lt: to } });

export const countByStatus = (status: DemoRequestStatus): Promise<number> => DemoRequest.countDocuments({ status });

/** How many leads sit in each pipeline status (statuses with none are absent). */
export const countPerStatus = async (): Promise<Array<{ _id: DemoRequestStatus; count: number }>> =>
  DemoRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

// The same source label the site analytics uses for a visit: utm_source, else the referring host, else Direct.
const SOURCE_LABEL = { $ifNull: ['$source.utmSource', { $ifNull: ['$source.referrer', 'Direct'] }] };

/** Leads created in [from, to), counted per source label. */
export const countBySource = (from: Date, to: Date): Promise<Array<{ _id: string; count: number }>> =>
  DemoRequest.aggregate([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: SOURCE_LABEL, count: { $sum: 1 } } }
  ]);

/** Leads created in [from, to), counted per IST day (`YYYY-MM-DD`). */
export const countByIstDay = (from: Date, to: Date): Promise<Array<{ _id: string; count: number }>> =>
  DemoRequest.aggregate([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
        count: { $sum: 1 }
      }
    }
  ]);

export const updateDemoRequest = (id: string, patch: Partial<IDemoRequest>): Promise<IDemoRequest | null> =>
  DemoRequest.findByIdAndUpdate(id, patch, { new: true });
