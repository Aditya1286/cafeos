import React from 'react';
import { Check } from 'lucide-react';
import { DemoFunnelOption, DemoFunnelQuestion } from '@/constants/demoFunnel';

interface QuestionStepProps {
  question: DemoFunnelQuestion;
  /** The answer given earlier (they came back to this question). */
  selected?: string;
  /** The option just tapped, highlighted while the next question slides in. */
  pending: string | null;
  onChoose: (option: DemoFunnelOption) => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

/** One tap-to-choose question. Options are plain buttons: big tap targets, keyboard and screen-reader friendly. */
export const QuestionStep: React.FC<QuestionStepProps> = ({
  question,
  selected,
  pending,
  onChoose,
  headingRef,
}) => (
  <div data-mascot-field={`demo-q-${question.key}`}>
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="text-lg sm:text-2xl font-black tracking-tight leading-snug text-slate-900 outline-none"
    >
      {question.question}
    </h2>
    {question.sub && <p className="mt-1 sm:mt-1.5 text-[13px] sm:text-sm text-slate-500 font-medium">{question.sub}</p>}

    <div
      role="group"
      aria-label={question.question}
      className={`mt-3.5 sm:mt-5 grid gap-2 sm:gap-2.5 ${question.compact ? 'grid-cols-2' : 'grid-cols-1'}`}
    >
      {question.options.map((option) => {
        const active = pending ? pending === option.value : selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={!!pending}
            onClick={() => onChoose(option)}
            className={`group relative flex items-center gap-3 w-full min-h-[46px] sm:min-h-[52px] px-3.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98] disabled:cursor-default ${
              active
                ? 'border-red-600 bg-red-50 shadow-sm shadow-red-600/10'
                : 'border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/40'
            }`}
          >
            <span className="flex-1 min-w-0">
              <span
                className={`block text-sm sm:text-[15px] font-bold leading-snug ${active ? 'text-red-700' : 'text-slate-800'}`}
              >
                {option.label}
              </span>
              {option.hint && (
                <span className="block mt-0.5 text-xs font-medium text-slate-500">
                  {option.hint}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                active
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-slate-300 group-hover:border-red-300'
              }`}
            >
              {active && <Check className="w-3 h-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
