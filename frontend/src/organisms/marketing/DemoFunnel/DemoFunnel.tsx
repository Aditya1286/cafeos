import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useDemoFunnel } from '@/hooks/useDemoFunnel';
import { FunnelProgress } from './FunnelProgress';
import { QuestionStep } from './QuestionStep';
import { ContactStep } from './ContactStep';
import { SentStep } from './SentStep';

interface DemoFunnelProps {
  funnel: ReturnType<typeof useDemoFunnel>;
}

/**
 * The request-a-demo flow: one tap-to-choose question per screen (constants/demoFunnel.ts), a short
 * reply naming the fix after each answer, then name, café and phone. State lives in useDemoFunnel,
 * which the page owns so the mascot can react to the same steps.
 */
export const DemoFunnel: React.FC<DemoFunnelProps> = ({ funnel }) => {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);

  // A new step starts in view, and keyboard / screen-reader focus moves to the new question. On
  // phones the page header is gone after the first answer (RequestDemoPage), so the top of the page
  // is the top of the card; on wider screens only a card scrolled past its top is brought back.
  // Not on first load: that would steal focus.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (window.matchMedia('(max-width: 767px)').matches) {
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior });
    } else if ((rootRef.current?.getBoundingClientRect().top ?? 0) < 0) {
      rootRef.current?.scrollIntoView({ behavior, block: 'start' });
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [funnel.stepIndex, reduceMotion]);

  if (funnel.sent) {
    return (
      <SentStep
        name={funnel.contact.name}
        brand={funnel.contact.brand}
        phone={funnel.contact.phone}
      />
    );
  }

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <div ref={rootRef} className="scroll-mt-24">
      <FunnelProgress
        stepIndex={funnel.stepIndex}
        totalSteps={funnel.totalSteps}
        onBack={funnel.back}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={funnel.stepKey}
          {...slide}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {funnel.reply && (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className="mb-3 sm:mb-4 flex items-start gap-2 px-3 py-2 sm:py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs sm:text-[13px] font-semibold text-red-800"
            >
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-600" />
              {funnel.reply}
            </motion.p>
          )}

          {funnel.question ? (
            <QuestionStep
              question={funnel.question}
              selected={funnel.answers[funnel.question.key]}
              pending={funnel.pendingValue}
              onChoose={funnel.choose}
              headingRef={headingRef}
            />
          ) : (
            <ContactStep
              contact={funnel.contact}
              onChange={funnel.updateContact}
              promises={funnel.promises}
              error={funnel.error}
              submitting={funnel.submitting}
              onSubmit={funnel.submit}
              headingRef={headingRef}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
