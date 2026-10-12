import { IDemoRequest, DemoRequestStatus, DEMO_REQUEST_STATUSES } from '../models/DemoRequest';
import * as demoRequestDao from '../dao/demoRequest.dao';
import { ServiceError } from '../utils/serviceError';

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export interface SubmitDemoRequestInput {
  name?: unknown;
  brandName?: unknown;
  phone?: unknown;
  email?: unknown;
  city?: unknown;
  businessType?: unknown;
  message?: unknown;
  interestedPlan?: unknown;
  consentToContact?: unknown;
  website?: unknown; // honeypot — real visitors never see or fill this
}

// A bot that fills the hidden honeypot field gets the same success reply as a real visitor but
// nothing is stored, so it learns nothing. The same goes for the same phone number asking again
// within 24h: the visitor is told "we've got it" and the existing lead isn't duplicated.
export const submitDemoRequest = async (input: SubmitDemoRequestInput): Promise<void> => {
  if (asTrimmedString(input.website)) return;

  const name = asTrimmedString(input.name);
  const brandName = asTrimmedString(input.brandName);
  const city = asTrimmedString(input.city);
  const phone = asTrimmedString(input.phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const email = asTrimmedString(input.email);

  if (!name || !brandName || !city) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Please fill in your name, café name and city.');
  }
  if (!PHONE_RE.test(phone)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Please enter a valid 10-digit mobile number.');
  }
  if (email && !EMAIL_RE.test(email)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Please enter a valid email address or leave it blank.');
  }
  if (input.consentToContact !== true) {
    throw new ServiceError(400, 'CONSENT_REQUIRED', 'Please agree to be contacted so we can set up your trial.');
  }

  const recent = await demoRequestDao.findRecentByPhone(phone, new Date(Date.now() - DUPLICATE_WINDOW_MS));
  if (recent) return;

  await demoRequestDao.createDemoRequest({
    name,
    brandName,
    phone,
    email: email || undefined,
    city,
    businessType: asTrimmedString(input.businessType) || undefined,
    message: asTrimmedString(input.message) || undefined,
    interestedPlan: asTrimmedString(input.interestedPlan) || undefined,
    consentToContact: true
  });
};

export const listForAdmin = async (opts: { status?: string; q?: string; page: number; limit: number }) => {
  const page = Math.max(1, opts.page);
  const limit = Math.min(100, Math.max(1, opts.limit));
  const status = opts.status && DEMO_REQUEST_STATUSES.includes(opts.status as DemoRequestStatus) ? opts.status : undefined;

  const [{ requests, total }, newCount] = await Promise.all([
    demoRequestDao.listDemoRequests({ status, q: opts.q }, page, limit),
    demoRequestDao.countByStatus('NEW')
  ]);

  return {
    requests,
    newCount,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
};

export const updateForAdmin = async (
  id: string,
  adminUserId: string,
  patch: { status?: unknown; adminNote?: unknown }
): Promise<IDemoRequest> => {
  const existing = await demoRequestDao.findDemoRequestById(id);
  if (!existing) throw new ServiceError(404, 'NOT_FOUND', 'Demo request not found.');

  const update: Partial<IDemoRequest> = { handledByUserId: adminUserId as any };

  if (patch.status !== undefined) {
    if (typeof patch.status !== 'string' || !DEMO_REQUEST_STATUSES.includes(patch.status as DemoRequestStatus)) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'Choose a valid status.');
    }
    update.status = patch.status as DemoRequestStatus;
    if (patch.status !== 'NEW' && !existing.contactedAt) update.contactedAt = new Date();
  }
  if (patch.adminNote !== undefined) {
    if (typeof patch.adminNote !== 'string' || patch.adminNote.length > 2000) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'Notes must be text up to 2000 characters.');
    }
    update.adminNote = patch.adminNote.trim();
  }

  const updated = await demoRequestDao.updateDemoRequest(id, update);
  if (!updated) throw new ServiceError(404, 'NOT_FOUND', 'Demo request not found.');
  return updated;
};
