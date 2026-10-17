// The daily question on the tracker (spec §9.2): one playful question per order from our bank,
// rotated so a guest is not asked again what they were already asked at this café, answered with
// one tap and remembered on the guest's profile. Answers need this café's guest pass for the
// order's own phone: knowing a phone number never lets anyone write someone else's memory.
import { Order } from '../models/Order';
import { addAskedQuestion, findGuestProfile, setAnswer } from '../dao/guestProfile.dao';
import { GUEST_QUESTIONS, GuestQuestion } from '../constants/guestQuestions';
import { ServiceError } from '../utils/serviceError';
import { phoneKeyOf } from '../utils/phone';
import { verifyGuestPass } from '../utils/guestToken';

type OrderDoc = InstanceType<typeof Order>;

export type PublicQuestion = { id: string; text: string; options: { id: string; label: string; emoji?: string }[] };

const ASKABLE_STATUSES = ['PLACED', 'PREPARING'];

const toPublic = (q: GuestQuestion): PublicQuestion => ({
  id: q.id,
  text: q.text,
  options: q.options.map((o) => ({ id: o.id, label: o.label, ...(o.emoji ? { emoji: o.emoji } : {}) }))
});

const activeQuestion = (id: string | undefined) => GUEST_QUESTIONS.find((q) => q.id === id && q.active);

/**
 * The question for this order, or null when the order is past PREPARING, already answered, the
 * guest has no profile at this café (no proven visit, so nothing could be remembered), or every
 * active question was already asked. The question picked is recorded on the order (so refreshing
 * the tracker shows the same one) and on the profile as asked.
 */
export const questionFor = async (order: OrderDoc): Promise<PublicQuestion | null> => {
  if (!ASKABLE_STATUSES.includes(order.orderStatus) || order.answeredQuestionId) return null;

  const already = activeQuestion(order.askedQuestionId);
  if (already) return toPublic(already);

  const profile = await findGuestProfile(order.businessId, phoneKeyOf(order.customerPhone));
  if (!profile) return null;
  const asked = new Set(profile.askedQuestionIds);
  const next = GUEST_QUESTIONS.find((q) => q.active && !asked.has(q.id));
  if (!next) return null;

  // Two tracker loads at once must settle on one question for the order.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, askedQuestionId: { $exists: false } },
    { $set: { askedQuestionId: next.id } },
    { new: true }
  );
  if (!claimed) {
    const winner = activeQuestion((await Order.findById(order._id).select('askedQuestionId'))?.askedQuestionId);
    return winner ? toPublic(winner) : null;
  }
  await addAskedQuestion(profile._id, next.id);
  return toPublic(next);
};

/** Records the guest's one-tap answer and returns the mascot's reply for it. */
export const answerQuestion = async (
  order: OrderDoc,
  guestPass: unknown,
  questionId: unknown,
  optionId: unknown
): Promise<{ reply: string; gesture: string }> => {
  const phone = phoneKeyOf(order.customerPhone);
  const pass = verifyGuestPass(guestPass, order.businessId.toString());
  if (!pass || !phone || pass.phone !== phone) {
    throw new ServiceError(403, 'NOT_YOUR_ORDER', 'Only the phone that placed this order can answer.');
  }
  const question = typeof questionId === 'string' ? activeQuestion(questionId) : undefined;
  const option = typeof optionId === 'string' ? question?.options.find((o) => o.id === optionId) : undefined;
  if (!question || !option || (order.askedQuestionId && order.askedQuestionId !== question.id)) {
    throw new ServiceError(400, 'INVALID_ANSWER', 'That is not one of the answers to this question.');
  }

  // One answer per order, settled atomically.
  const claimed = await Order.updateOne(
    { _id: order._id, answeredQuestionId: { $exists: false } },
    { $set: { answeredQuestionId: question.id } }
  );
  if (claimed.modifiedCount === 0) {
    throw new ServiceError(400, 'ALREADY_ANSWERED', 'This order’s question is already answered.');
  }
  await setAnswer(order.businessId, phone, question.id, option.id, new Date());
  return { reply: option.reply, gesture: option.replyGesture };
};
