import React, { useState } from 'react';
import { FAQS, Faq } from '@/constants/faqs';
import { FaqItem } from './FaqItem';

interface FaqSectionProps {
  items?: Faq[];
  /** Index opened on first render; null starts with everything closed. */
  defaultOpen?: number | null;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ items = FAQS, defaultOpen = 0 }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);

  return (
    // `w-full` matters: the page root is a flex column, where an `mx-auto` child otherwise
    // shrinks to its content and the whole block resizes as answers open and close.
    <section id="faq" className="scroll-mt-20 w-full max-w-3xl mx-auto py-24 px-4 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-slate-900 mb-3">Frequently Asked Questions</h2>
        <p className="text-sm text-slate-500 font-semibold">Quick answers before you start</p>
      </div>

      <div className="space-y-3">
        {items.map((faq, idx) => (
          <FaqItem
            key={faq.q}
            id={`faq-${idx}`}
            question={faq.q}
            answer={faq.a}
            open={openIndex === idx}
            onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
          />
        ))}
      </div>
    </section>
  );
};
export default FaqSection;
