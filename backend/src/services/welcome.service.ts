// The returning-guest welcome (spec §8.1, §9.3): one line for a guest whose device holds this café's
// guest pass, built from what the café remembers (first name, latest answers) and the guest's usual
// dish, derived from their orders at query time. Never from a phone number alone, never the phone.
import mongoose from 'mongoose';
import { IBusiness } from '../models/Business';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { IGuestProfile } from '../models/GuestProfile';
import { findGuestProfile, setLastWelcomeTemplate } from '../dao/guestProfile.dao';
import { GUEST_QUESTIONS } from '../constants/guestQuestions';
import { MASCOT_COPY, CopyLine } from '../constants/mascotCopy';
import { fillTemplate } from './copyTemplates';
import { isIdentityOnFor } from './cafeIdentity.service';
import { verifyGuestPass } from '../utils/guestToken';
import { phoneMatchPattern } from '../utils/phone';

type BusinessDoc = mongoose.HydratedDocument<IBusiness>;

// The usual is looked for within the guest memory's own lifetime.
const USUAL_WINDOW_DAYS = 365;
const USUAL_CANDIDATES = 10;

/**
 * The guest's most-ordered dish at this café that is on the menu right now: counted as separate
 * orders (not cancelled or refunded) that include it, matching however the phone was typed.
 */
export const usualProductFor = async (businessId: string, phoneKey: string): Promise<{ productId: string; name: string } | null> => {
  if (!mongoose.Types.ObjectId.isValid(businessId) || !/^\d{10}$/.test(phoneKey)) return null;
  const since = new Date(Date.now() - USUAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const ranked: { _id: mongoose.Types.ObjectId }[] = await Order.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        customerPhone: phoneMatchPattern(phoneKey),
        createdAt: { $gte: since },
        orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] }
      }
    },
    { $unwind: '$items' },
    // One count per order, however many lines of the dish it has.
    { $group: { _id: { order: '$_id', product: '$items.productId' }, at: { $max: '$createdAt' } } },
    { $group: { _id: '$_id.product', orders: { $sum: 1 }, last: { $max: '$at' } } },
    { $sort: { orders: -1, last: -1 } },
    { $limit: USUAL_CANDIDATES }
  ]);
  if (!ranked.length) return null;

  const available = await Product.find({
    _id: { $in: ranked.map((r) => r._id) },
    businessId,
    isAvailable: true,
    isDeleted: { $ne: true }
  }).select('name');
  const byId = new Map(available.map((p) => [p._id.toString(), p.name]));
  for (const r of ranked) {
    const name = byId.get(r._id.toString());
    if (name) return { productId: r._id.toString(), name };
  }
  return null;
};

const usesUsual = (line: CopyLine) => line.text.includes('{usual}');

/** Welcome templates of the options this guest picked, most recent answer first. */
const answerTemplates = (profile: IGuestProfile): CopyLine[] => {
  const answers = [...(profile.answers?.entries() ?? [])].sort(
    ([, a], [, b]) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
  );
  const lines: CopyLine[] = [];
  for (const [questionId, answer] of answers) {
    const option = GUEST_QUESTIONS.find((q) => q.id === questionId && q.active)?.options.find((o) => o.id === answer.optionId);
    if (option) lines.push(...option.welcomeTemplates);
  }
  return lines;
};

/**
 * Picks the welcome line. Tiers, in order: the guest's own answer templates that use the usual
 * dish, the with-usual fallbacks, the answer templates with the name only, the name-only fallbacks.
 * A template whose placeholders can't be filled is skipped (so without a usual dish only name-only
 * lines remain), and the one used last time is avoided whenever another one is eligible.
 */
export const pickWelcome = (
  profile: IGuestProfile,
  usual: { name: string } | null,
  random: () => number = Math.random
): { id: string; line: string } | null => {
  const values = { name: profile.firstName, ...(usual ? { usual: usual.name } : {}) };
  const fill = (lines: CopyLine[]) =>
    lines.flatMap((l) => {
      const line = fillTemplate(l.text, values);
      return line ? [{ id: l.id, line, usual: usesUsual(l) }] : [];
    });
  const fromAnswers = fill(answerTemplates(profile));
  const fallbacks = fill(MASCOT_COPY.welcomeFallbacks);
  const tiers = [
    fromAnswers.filter((t) => t.usual),
    fallbacks.filter((t) => t.usual),
    fromAnswers.filter((t) => !t.usual),
    fallbacks.filter((t) => !t.usual)
  ];
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length) % list.length];
  for (const tier of tiers) {
    const fresh = tier.filter((t) => t.id !== profile.lastWelcomeTemplateId);
    if (fresh.length) {
      const { id, line } = pick(fresh);
      return { id, line };
    }
  }
  const any = tiers.find((t) => t.length);
  return any ? { id: any[0].id, line: any[0].line } : null;
};

/**
 * The welcome for the guest holding `guestPass`, or null when identity is off for the café, the pass
 * is missing, invalid, expired or another café's, or the café remembers nothing about the guest.
 */
export const welcomeFor = async (business: BusinessDoc, guestPass: unknown): Promise<{ line: string; usualProductId?: string } | null> => {
  if (!isIdentityOnFor(business)) return null;
  const businessId = business._id.toString();
  const pass = verifyGuestPass(guestPass, businessId);
  if (!pass) return null;
  const profile = await findGuestProfile(business._id, pass.phone);
  if (!profile || !profile.firstName) return null;

  const usual = await usualProductFor(businessId, pass.phone);
  const chosen = pickWelcome(profile, usual);
  if (!chosen) return null;
  await setLastWelcomeTemplate(profile._id, chosen.id);
  return { line: chosen.line, ...(usual ? { usualProductId: usual.productId } : {}) };
};
