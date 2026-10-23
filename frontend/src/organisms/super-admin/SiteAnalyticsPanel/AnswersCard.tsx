import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { DEMO_FUNNEL_QUESTIONS, DemoFunnelQuestion } from '@/constants/demoFunnel';
import { AnswerSlice, answerSlices } from '@/utils/answerChart';
import { Empty } from './parts';

// What is worth writing ads about comes first; type and city are context.
const ORDER = ['rushPain', 'extras', 'salesKnown', 'timeline', 'tables', 'businessType', 'city'];

/** One question as a poll: the winning answer in big type, then 100 squares, one per 1% of owners. */
const PollTile: React.FC<{
  question: DemoFunnelQuestion;
  slices: AnswerSlice[];
  total: number;
  index: number;
}> = ({ question, slices, total, index }) => {
  const reduce = useReducedMotion();
  const top = slices[0];
  const cells = slices.flatMap((s) => Array.from({ length: s.percent }, () => s));
  const tied = slices.length > 1 && slices[1].count === top.count;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 flex flex-col">
      <p className="text-[11px] font-bold text-slate-500 leading-snug">{question.question}</p>

      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums text-slate-900">{top.percent}%</span>
        <span className="text-xs font-semibold text-slate-500">{tied ? 'tie, led by' : 'say'}</span>
      </p>
      <p className="text-sm font-black text-slate-900 leading-snug">“{top.label}”</p>

      <div
        role="img"
        aria-label={slices.map((s) => `${s.label} ${s.percent}%`).join(', ')}
        className="mt-3 grid grid-cols-10 gap-[3px] max-w-[220px]"
      >
        {cells.map((s, i) => (
          <motion.span
            key={i}
            title={`${s.label}: ${s.percent}%`}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 + i * 0.006, duration: 0.2 }}
            className="aspect-square rounded-[3px]"
            style={{ background: s.colour }}
          />
        ))}
      </div>

      <ul className="mt-3 space-y-1">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: s.colour }} />
            <span className="font-semibold text-slate-700 truncate">{s.label}</span>
            <span className="ml-auto font-black text-slate-900 tabular-nums">{s.percent}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] font-bold text-slate-400">
        {total} {total === 1 ? 'owner' : 'owners'} answered · 1 square = 1%
      </p>
    </div>
  );
};

/** Every question's answers as a poll tile, the ones worth turning into posts first. */
export const AnswersCard: React.FC<{ answers: SiteReport['answers'] }> = ({ answers }) => {
  const polls = useMemo(() => {
    const byStep = new Map<string, Array<{ value: string; visits: number }>>();
    for (const a of answers) byStep.set(a.step, [...(byStep.get(a.step) ?? []), a]);
    return DEMO_FUNNEL_QUESTIONS.filter((q) => byStep.has(q.key))
      .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
      .map((q) => {
        const rows = byStep.get(q.key)!;
        return { q, slices: answerSlices(q, rows), total: rows.reduce((n, r) => n + r.visits, 0) };
      })
      .filter((p) => p.slices.length > 0);
  }, [answers]);

  return (
    <section className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm min-w-0">
      <h3 className="text-sm font-black text-slate-900">What café owners told you</h3>
      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
        Every quiz answer, including people who did not finish. The big line on each card is a
        ready-made hook for your next post.
      </p>
      <div className="mt-4">
        {polls.length === 0 ? (
          <Empty text="No answers yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {polls.map(({ q, slices, total }, i) => (
              <PollTile key={q.key} question={q} slices={slices} total={total} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
