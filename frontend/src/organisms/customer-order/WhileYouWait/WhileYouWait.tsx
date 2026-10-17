import React, { useState } from 'react';
import type { Pairing } from '@/services/public/whileYouWait';
import type { WhileYouWait as WhileYouWaitState } from '@/hooks/useWhileYouWait';
import { PairingCard } from './PairingCard';
import { AddToOrderSheet } from './AddToOrderSheet';
import { DailyQuestionCard } from './DailyQuestionCard';

interface WhileYouWaitProps {
  /** From useWhileYouWait: empty unless the order is PLACED or PREPARING. */
  wait: WhileYouWaitState;
  subtotalPaise: number;
  taxRatePercentage: number;
}

/** Under the tracker's status: "Goes well with your order" and the daily question (spec §9). Both are
 * optional; with neither there is no block at all. */
export const WhileYouWait: React.FC<WhileYouWaitProps> = ({ wait, subtotalPaise, taxRatePercentage }) => {
  const [adding, setAdding] = useState<Pairing | null>(null);
  // "Not now" hides the question without answering it, for as long as the tracker is open.
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const question = wait.question && wait.question.id !== dismissedId ? wait.question : null;
  const answeredOnly = !wait.question && !!wait.mascotReply;
  if (!wait.pairings.length && !question && !answeredOnly) return null;

  return (
    <section aria-labelledby="while-you-wait" className="mb-6 space-y-3">
      <h3
        id="while-you-wait"
        className="text-[10px] font-black uppercase tracking-wider text-cafe-neutral-400 px-1"
      >
        While you wait
      </h3>

      {wait.pairings.map((pairing) => (
        <PairingCard key={pairing.productId} pairing={pairing} onAdd={setAdding} />
      ))}

      {question && (
        <DailyQuestionCard
          key={question.id}
          question={question}
          onAnswer={wait.answer}
          onDismiss={() => setDismissedId(question.id)}
        />
      )}
      {answeredOnly && <p className="text-xs font-bold text-cafe-muted px-1">Answered ✓</p>}

      {adding && (
        <AddToOrderSheet
          pairing={adding}
          subtotalPaise={subtotalPaise}
          taxRatePercentage={taxRatePercentage}
          onClose={() => setAdding(null)}
          onConfirm={async (quantity) => {
            await wait.addToOrder(adding.productId, quantity);
            setAdding(null);
          }}
        />
      )}
    </section>
  );
};

export default WhileYouWait;
