import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import demoRequestsService from '@/services/public/demoRequests';
import { DemoRequestAnswer } from '@/services/public/demoRequests/types';
import {
  DEMO_FUNNEL_QUESTIONS,
  DemoFunnelOption,
  DemoFunnelQuestion,
} from '@/constants/demoFunnel';
import { promisesFor } from '@/utils/demoLeads';
import { trackSiteEvent } from '@/utils/siteTracking';
import { getVisitSource, getVisitorId } from '@/utils/siteVisitor';

/** The step after the last question: name, café and phone. */
export const CONTACT_STEP_KEY = 'contact';

// How long the chosen option stays highlighted before the next question slides in.
const ADVANCE_DELAY_MS = 280;
// Answers survive a reload or a trip to another tab (sessionStorage); typed contact details don't.
const PROGRESS_KEY = 'caos.demoFunnel';

export interface DemoContact {
  name: string;
  brand: string;
  phone: string;
  consent: boolean;
  website: string; // honeypot: hidden from people, bots fill it
}

const EMPTY_CONTACT: DemoContact = { name: '', brand: '', phone: '', consent: false, website: '' };

interface SavedProgress {
  stepIndex: number;
  answers: Record<string, string>;
}

const QUESTION_COUNT = DEMO_FUNNEL_QUESTIONS.length;

const loadProgress = (): SavedProgress => {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(PROGRESS_KEY) || 'null',
    ) as SavedProgress | null;
    if (
      saved &&
      typeof saved.stepIndex === 'number' &&
      saved.answers &&
      typeof saved.answers === 'object'
    ) {
      return {
        stepIndex: Math.min(Math.max(0, saved.stepIndex), QUESTION_COUNT),
        answers: saved.answers,
      };
    }
  } catch {
    // storage off or garbage: start fresh
  }
  return { stepIndex: 0, answers: {} };
};

const optionFor = (
  question: DemoFunnelQuestion,
  value: string | undefined,
): DemoFunnelOption | undefined => question.options.find((o) => o.value === value);

/**
 * State for the one-question-per-screen demo request (organisms/marketing/DemoFunnel): which step
 * is showing, the answers so far, the contact form, and the submit. Each step shown, each answer
 * and the final submit are reported to the site's own analytics, which is what the Website tab's
 * funnel is built from.
 */
export const useDemoFunnel = (interestedPlan?: string) => {
  const [{ stepIndex, answers }, setProgress] = useState<SavedProgress>(loadProgress);
  const [reply, setReply] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [contact, setContact] = useState<DemoContact>(EMPTY_CONTACT);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const advanceTimer = useRef<number | undefined>(undefined);
  const lastTrackedStep = useRef<number | null>(null);

  const question: DemoFunnelQuestion | null =
    stepIndex < QUESTION_COUNT ? DEMO_FUNNEL_QUESTIONS[stepIndex] : null;
  const stepKey = question?.key ?? CONTACT_STEP_KEY;

  useEffect(() => {
    try {
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ stepIndex, answers }));
    } catch {
      // not persisted; the flow still works
    }
  }, [stepIndex, answers]);

  // Once per step reached (the ref also keeps React's dev double-effects from counting it twice).
  useEffect(() => {
    if (sent || lastTrackedStep.current === stepIndex) return;
    lastTrackedStep.current = stepIndex;
    trackSiteEvent('demo_step', { step: stepKey, stepIndex });
  }, [stepIndex, stepKey, sent]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const choose = useCallback(
    (option: DemoFunnelOption) => {
      if (!question || pendingValue) return; // a second tap while the first is still settling
      setPendingValue(option.value);
      trackSiteEvent('demo_answer', { step: question.key, stepIndex, value: option.value });
      advanceTimer.current = window.setTimeout(() => {
        setProgress((prev) => ({
          stepIndex: prev.stepIndex + 1,
          answers: { ...prev.answers, [question.key]: option.value },
        }));
        setReply(option.reply ?? null);
        setPendingValue(null);
      }, ADVANCE_DELAY_MS);
    },
    [question, stepIndex, pendingValue],
  );

  const back = useCallback(() => {
    window.clearTimeout(advanceTimer.current);
    setPendingValue(null);
    setReply(null);
    setError('');
    setProgress((prev) => ({ ...prev, stepIndex: Math.max(0, prev.stepIndex - 1) }));
  }, []);

  const updateContact = useCallback((patch: Partial<DemoContact>) => {
    setError('');
    setContact((prev) => ({ ...prev, ...patch }));
  }, []);

  // The last screen's "what we'll show you": the fix for each thing they said hurts, then the constants.
  const promises = useMemo(() => promisesFor(answers), [answers]);

  const submit = useCallback(async () => {
    setError('');
    if (!contact.name.trim() || !contact.brand.trim()) {
      setError('Please add your name and your café’s name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(contact.phone.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!contact.consent) {
      setError('Please tick the box so we can call you about your free trial.');
      return;
    }

    const quizAnswers: DemoRequestAnswer[] = [];
    let businessType: string | undefined;
    let city = '';
    for (const q of DEMO_FUNNEL_QUESTIONS) {
      const option = optionFor(q, answers[q.key]);
      if (!option) continue;
      quizAnswers.push({
        key: q.key,
        question: q.adminTitle,
        value: option.value,
        answer: option.label,
      });
      if (q.leadField === 'businessType') businessType = option.field ?? option.label;
      if (q.leadField === 'city') city = option.field ?? option.label;
    }

    setSubmitting(true);
    try {
      await demoRequestsService.submit({
        name: contact.name.trim(),
        brandName: contact.brand.trim(),
        phone: contact.phone.trim(),
        // Every question is answered on the way here; 'Other' only covers a reload that lost them.
        city: city || 'Other',
        businessType,
        interestedPlan,
        answers: quizAnswers,
        source: { visitorId: getVisitorId(), ...getVisitSource() },
        consentToContact: true,
        website: contact.website,
      });
      trackSiteEvent('demo_submit');
      try {
        sessionStorage.removeItem(PROGRESS_KEY);
      } catch {
        // nothing to clean up
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, contact, interestedPlan]);

  return {
    question,
    stepIndex,
    stepKey,
    /** Questions plus the contact step. */
    totalSteps: QUESTION_COUNT + 1,
    answers,
    pendingValue,
    reply,
    promises,
    contact,
    updateContact,
    choose,
    back,
    submit,
    submitting,
    error,
    sent,
  };
};
