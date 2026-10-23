import {
  IDemoRequest,
  IDemoRequestAnswer,
  IDemoRequestSource,
  DemoRequestStatus,
  DEMO_REQUEST_STATUSES
} from '../models/DemoRequest';
import * as demoRequestDao from '../dao/demoRequest.dao';
import { notifications } from '../config';
import { sendEmail, escapeHtml } from './email.service';
import { ServiceError } from '../utils/serviceError';

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const clip = (value: unknown, max: number): string => asTrimmedString(value).slice(0, max);

const MAX_ANSWERS = 12;
const ANSWER_KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const ANSWER_VALUE_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;

// The quiz answers arrive with their own wording (see IDemoRequestAnswer). Anything malformed is
// dropped rather than rejected: a lead with phone and name is worth keeping even if one answer
// came through broken.
const parseAnswers = (raw: unknown): IDemoRequestAnswer[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const answers: IDemoRequestAnswer[] = [];
  for (const item of raw.slice(0, MAX_ANSWERS)) {
    if (!item || typeof item !== 'object') continue;
    const key = asTrimmedString((item as any).key);
    const value = asTrimmedString((item as any).value);
    const question = clip((item as any).question, 120);
    const answer = clip((item as any).answer, 160);
    if (!ANSWER_KEY_RE.test(key) || !ANSWER_VALUE_RE.test(value) || !question || !answer || seen.has(key)) continue;
    seen.add(key);
    answers.push({ key, question, value, answer });
  }
  return answers;
};

const parseSource = (raw: unknown): IDemoRequestSource | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const source: IDemoRequestSource = {
    visitorId: clip(r.visitorId, 64) || undefined,
    referrer: clip(r.referrer, 200) || undefined,
    utmSource: clip(r.utmSource, 100).toLowerCase() || undefined,
    utmMedium: clip(r.utmMedium, 100).toLowerCase() || undefined,
    utmCampaign: clip(r.utmCampaign, 150) || undefined,
    landingPath: clip(r.landingPath, 200) || undefined
  };
  // Same shape as the site analytics' referrer, so a lead's source matches its visit's.
  if (source.referrer) source.referrer = source.referrer.toLowerCase().replace(/^www\./, '');
  return Object.values(source).some(Boolean) ? source : undefined;
};

export interface SubmitDemoRequestInput {
  name?: unknown;
  brandName?: unknown;
  phone?: unknown;
  email?: unknown;
  city?: unknown;
  businessType?: unknown;
  message?: unknown;
  interestedPlan?: unknown;
  answers?: unknown;
  source?: unknown;
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

  const saved = await demoRequestDao.createDemoRequest({
    name,
    brandName,
    phone,
    email: email || undefined,
    city,
    businessType: asTrimmedString(input.businessType) || undefined,
    message: asTrimmedString(input.message) || undefined,
    interestedPlan: asTrimmedString(input.interestedPlan) || undefined,
    answers: parseAnswers(input.answers),
    source: parseSource(input.source),
    consentToContact: true
  });

  // Not awaited: the visitor's "you're in" must not wait on (or fail because of) the email.
  void notifyNewDemoRequest(saved);
};

const formatIst = (date: Date): string =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(date);

/** Emails `notifications.demoRequestTo` about a new lead: who, how to reach them, and their quiz answers. */
export const notifyNewDemoRequest = (lead: IDemoRequest): Promise<boolean> => {
  const source = lead.source;
  const sourceText = source
    ? [
        source.utmSource && `utm: ${[source.utmSource, source.utmMedium, source.utmCampaign].filter(Boolean).join(' / ')}`,
        source.referrer && `from ${source.referrer}`,
        source.landingPath && `landed on ${source.landingPath}`
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ['Café', lead.brandName],
    ['Phone', `+91 ${lead.phone}`],
    ['City', lead.city]
  ];
  if (lead.businessType) rows.push(['Type', lead.businessType]);
  if (lead.interestedPlan) rows.push(['Plan clicked', lead.interestedPlan]);
  for (const a of lead.answers) rows.push([a.question, a.answer]);
  if (sourceText) rows.push(['Came from', sourceText]);
  rows.push(['Requested', formatIst(lead.createdAt)]);

  const row = ([label, value]: [string, string]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px">
<h2 style="margin:0 0 4px;color:#DC2626;font-size:20px">New demo request</h2>
<p style="margin:0 0 16px;color:#475569;font-size:14px">${escapeHtml(lead.brandName)} in ${escapeHtml(lead.city)} wants a free trial.</p>
<table style="border-collapse:collapse">${rows.map(row).join('')}</table>
<p style="margin:20px 0 0">
<a href="tel:+91${lead.phone}" style="display:inline-block;padding:10px 16px;background:#DC2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Call +91 ${lead.phone}</a>
<a href="https://wa.me/91${lead.phone}" style="display:inline-block;margin-left:8px;padding:10px 16px;border:1px solid #DC2626;color:#DC2626;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">WhatsApp</a>
</p>
</div>`;

  const text = ['New demo request', '', ...rows.map(([label, value]) => `${label}: ${value}`)].join('\n');

  return sendEmail({
    to: notifications.demoRequestTo,
    subject: `New demo request: ${lead.brandName}, ${lead.city}`,
    html,
    text
  });
};

export const listForAdmin = async (opts: { status?: string; q?: string; page: number; limit: number }) => {
  const page = Math.max(1, opts.page);
  const limit = Math.min(100, Math.max(1, opts.limit));
  const status = opts.status && DEMO_REQUEST_STATUSES.includes(opts.status as DemoRequestStatus) ? opts.status : undefined;

  const [{ requests, total }, perStatus] = await Promise.all([
    demoRequestDao.listDemoRequests({ status, q: opts.q }, page, limit),
    demoRequestDao.countPerStatus()
  ]);

  // Every status, zeros included, so the pipeline tabs always show all five.
  const statusCounts = Object.fromEntries(DEMO_REQUEST_STATUSES.map((s) => [s, 0])) as Record<DemoRequestStatus, number>;
  for (const row of perStatus) statusCounts[row._id] = row.count;

  return {
    requests,
    newCount: statusCounts.NEW,
    statusCounts,
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
