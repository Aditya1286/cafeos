import React from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItemProps {
  id: string;
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}

/** One accordion row. The answer is always in the DOM and its height animates between 0fr and
 * 1fr, so opening or closing never mounts/unmounts content (which is what made the page jump). */
export const FaqItem: React.FC<FaqItemProps> = ({ id, question, answer, open, onToggle }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <button
      type="button"
      id={`${id}-button`}
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      onClick={onToggle}
      className="w-full p-4 text-left font-bold text-sm text-slate-900 flex items-center justify-between gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-500"
    >
      <span>{question}</span>
      <ChevronDown
        aria-hidden="true"
        className={`w-4 h-4 shrink-0 text-red-600 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      />
    </button>

    <div
      id={`${id}-panel`}
      role="region"
      aria-labelledby={`${id}-button`}
      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
    >
      <div className="min-h-0 overflow-hidden">
        <p
          className={`px-4 pb-4 pt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 ${open ? 'visible' : 'invisible'}`}
        >
          {answer}
        </p>
      </div>
    </div>
  </div>
);
