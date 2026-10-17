import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { DailyQuestion } from '@/services/public/whileYouWait';

interface DailyQuestionCardProps {
  question: DailyQuestion;
  onAnswer: (optionId: string) => Promise<unknown>;
  onDismiss: () => void;
}

/** One playful question, answered with one tap. "Not now" hides it without answering; an answer
 * collapses it to "Answered ✓" (the mascot replies in its bubble). */
export const DailyQuestionCard: React.FC<DailyQuestionCardProps> = ({ question, onAnswer, onDismiss }) => {
  const [state, setState] = useState<'open' | 'sending' | 'answered'>('open');
  const [error, setError] = useState<string | null>(null);

  if (state === 'answered') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-bold text-cafe-muted px-1">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Answered ✓
      </p>
    );
  }

  const pick = async (optionId: string) => {
    setState('sending');
    setError(null);
    try {
      await onAnswer(optionId);
      setState('answered');
    } catch (err: any) {
      if (err?.code === 'ALREADY_ANSWERED') return setState('answered');
      setError(err?.message || 'Could not send that. Try again?');
      setState('open');
    }
  };

  return (
    <div className="p-4 rounded-cafe-card bg-cafe-surface border border-cafe-line space-y-3">
      <p className="text-sm font-black font-cafe-display text-cafe-ink leading-snug">{question.text}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={state === 'sending'}
            onClick={() => pick(option.id)}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-cafe-chip bg-cafe-raised border border-cafe-line text-xs font-bold text-cafe-neutral-700 hover:border-cafe-accent-400 disabled:opacity-60 transition-colors"
          >
            {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={onDismiss}
        className="text-[11px] font-bold text-cafe-muted underline underline-offset-2"
      >
        Not now
      </button>
    </div>
  );
};

export default DailyQuestionCard;
