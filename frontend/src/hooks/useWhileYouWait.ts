import { useCallback, useEffect, useRef, useState } from 'react';
import whileYouWaitService, {
  type AnswerReply,
  type DailyQuestion,
  type Pairing,
} from '@/services/public/whileYouWait';
import guestService from '@/services/public/guest';
import type { IdentityEventKind } from '@/services/public/guest';
import { readGuestPass } from '@/utils/guestPass';

// The tracker's "While you wait" (spec §9): pairings with Add, and the daily question. Shown only
// while the order is PLACED or PREPARING; any other status (or an empty one, which the page passes
// while café identity is off) means nothing is fetched and nothing is returned.

export const WAITING_STATUSES = ['PLACED', 'PREPARING'];

export interface WhileYouWait {
  pairings: Pairing[];
  question: DailyQuestion | null;
  /** Adds a pairing to this same order, then the page refetches the tracker. Rejects on failure. */
  addToOrder: (productId: string, quantity: number) => Promise<void>;
  /** The guest's one-tap answer; resolves with the mascot's reply. Rejects on failure. */
  answer: (optionId: string) => Promise<AnswerReply>;
  /** The mascot's reply to the last answer, until the order stops waiting. */
  mascotReply: string | null;
  replyGesture: string | null;
}

const EMPTY = { pairings: [] as Pairing[], question: null as DailyQuestion | null };

export const useWhileYouWait = (
  orderId: string,
  orderStatus: string,
  businessId: string,
  { onOrderChanged }: { onOrderChanged?: () => unknown } = {},
): WhileYouWait => {
  const waiting = !!orderId && WAITING_STATUSES.includes(orderStatus);
  const [data, setData] = useState(EMPTY);
  const [reply, setReply] = useState<AnswerReply | null>(null);
  const shown = useRef(new Set<string>());
  const onChangedRef = useRef(onOrderChanged);
  onChangedRef.current = onOrderChanged;

  const record = useCallback(
    (kind: IdentityEventKind) => {
      if (businessId) guestService.recordEvent({ businessId, kind, orderId });
    },
    [businessId, orderId],
  );

  const load = useCallback(async () => {
    try {
      const res = await whileYouWaitService.get(orderId);
      const next = { pairings: res.data?.pairings ?? [], question: res.data?.question ?? null };
      setData(next);
      // Each block's "shown" event once per order on this page.
      if (next.pairings.length && !shown.current.has('pairing')) {
        shown.current.add('pairing');
        record('pairing_shown');
      }
      if (next.question && !shown.current.has(`q:${next.question.id}`)) {
        shown.current.add(`q:${next.question.id}`);
        record('question_shown');
      }
    } catch {
      // Optional extras: a failure just leaves the tracker as it was.
      setData(EMPTY);
    }
  }, [orderId, record]);

  // Refetched whenever the status changes; cleared once the order stops waiting.
  useEffect(() => {
    if (!waiting) {
      setData(EMPTY);
      setReply(null);
      return;
    }
    load();
  }, [waiting, orderStatus, load]);

  const addToOrder = useCallback(
    async (productId: string, quantity: number) => {
      await whileYouWaitService.addItems(orderId, readGuestPass(businessId), [{ productId, quantity }]);
      record('pairing_added');
      await Promise.all([onChangedRef.current?.(), load()]);
    },
    [orderId, businessId, record, load],
  );

  const answer = useCallback(
    async (optionId: string) => {
      const question = data.question;
      if (!question) throw new Error('There is no question to answer.');
      const res = await whileYouWaitService.answer(orderId, readGuestPass(businessId), {
        questionId: question.id,
        optionId,
      });
      record('question_answered');
      setReply(res.data);
      return res.data;
    },
    [data.question, orderId, businessId, record],
  );

  if (!waiting) {
    return { ...EMPTY, addToOrder, answer, mascotReply: null, replyGesture: null };
  }
  return {
    pairings: data.pairings,
    question: data.question,
    addToOrder,
    answer,
    mascotReply: reply?.reply ?? null,
    replyGesture: reply?.gesture ?? null,
  };
};

export default useWhileYouWait;
