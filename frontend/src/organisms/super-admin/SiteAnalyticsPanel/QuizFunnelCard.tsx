import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Droplet } from 'lucide-react';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { funnelSteps } from '@/utils/siteInsights';
import { Card, Empty } from './parts';

// A bar never gets thinner than this (as % of the funnel's width), so its count stays readable.
const MIN_WIDTH = 14;

/**
 * The quiz as a real funnel: each step is a bar centred on one axis, as wide as the people who
 * reached it, joined to the next by a sloped neck. Where people leave, a badge sits on the neck;
 * the worst leak drips. It pours in from the top when it appears.
 */
export const QuizFunnelCard: React.FC<{ report: SiteReport }> = ({ report }) => {
  const reduce = useReducedMotion();

  if (report.funnel.length === 0) {
    return (
      <Card title="Where people leave the quiz">
        <Empty text="Nobody has opened the demo quiz in this period." />
      </Card>
    );
  }

  const steps = funnelSteps(report);
  const started = steps[0].reached;
  const sent = report.funnelSubmitted;
  const madeIt = started > 0 ? Math.round((sent / started) * 100) : 0;
  const width = (n: number) => (started > 0 ? Math.max(MIN_WIDTH, (n / started) * 100) : MIN_WIDTH);
  const worst = steps.reduce((w, s) => (s.left > w.left ? s : w), steps[0]);
  const nobodyLeft = steps.every((s) => s.left === 0);

  return (
    <Card title="Where people leave the quiz">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 -mt-1 mb-5">
        <span className="text-2xl font-black text-slate-900 tabular-nums">{started}</span>
        <span className="text-xs font-bold text-slate-500">started</span>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <span className="text-2xl font-black text-emerald-600 tabular-nums">{sent}</span>
        <span className="text-xs font-bold text-slate-500">sent it</span>
        <span
          className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-black ${
            madeIt >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {nobodyLeft ? 'Nobody left · 100% made it' : `${madeIt}% made it through`}
        </span>
      </div>

      <ol aria-label="People at each step of the demo quiz">
        {steps.map((s, i) => {
          const next = steps[i + 1];
          const isSent = s.key === 'sent';
          const w = width(s.reached);
          const isWorst = !nobodyLeft && s === worst && s.left > 0;
          return (
            <li key={s.key}>
              <div
                className="grid grid-cols-[minmax(0,34%)_minmax(0,1fr)_44px] items-center gap-2"
                aria-label={`${s.title}: ${s.reached} people${s.left ? `, ${s.left} left here` : ''}`}
              >
                <span
                  className={`text-[11px] sm:text-xs font-bold leading-tight ${isSent ? 'text-emerald-700' : 'text-slate-700'}`}
                >
                  {s.title.replace(/^\d+\. /, '')}
                </span>
                <div className="h-7 flex justify-center">
                  <motion.div
                    initial={reduce ? false : { width: 0, opacity: 0 }}
                    animate={{ width: `${w}%`, opacity: 1 }}
                    transition={{ delay: i * 0.07, duration: 0.45, ease: 'easeOut' }}
                    className={`h-full rounded-md flex items-center justify-center ${
                      isSent ? 'bg-emerald-500' : 'bg-brand-500'
                    }`}
                  >
                    {isSent ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      w >= 30 && (
                        <span className="text-[10px] font-black text-white/90 tabular-nums">
                          {started ? Math.round((s.reached / started) * 100) : 0}%
                        </span>
                      )
                    )}
                  </motion.div>
                </div>
                <span className="text-right text-sm font-black text-slate-900 tabular-nums">
                  {s.reached}
                </span>
              </div>

              {next && (
                <div className="grid grid-cols-[minmax(0,34%)_minmax(0,1fr)_44px] gap-2 h-5">
                  <span />
                  {/* The neck between two steps: a trapezoid from this bar's width to the next one's. */}
                  <div className="relative">
                    <motion.div
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.07 + 0.3 }}
                      className={`absolute inset-0 ${isWorst ? 'bg-rose-200' : 'bg-brand-100'}`}
                      style={{
                        clipPath: `polygon(${50 - w / 2}% 0, ${50 + w / 2}% 0, ${50 + width(next.reached) / 2}% 100%, ${
                          50 - width(next.reached) / 2
                        }% 100%)`,
                      }}
                    />
                    {s.left > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={`relative px-1.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                            isWorst ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          −{s.left} left
                          {isWorst && !reduce && (
                            <motion.span
                              aria-hidden="true"
                              className="absolute left-1 top-full text-rose-500"
                              animate={{ y: [0, 14], opacity: [1, 0] }}
                              transition={{
                                duration: 1.1,
                                repeat: Infinity,
                                ease: 'easeIn',
                                repeatDelay: 0.4,
                              }}
                            >
                              <Droplet className="w-2.5 h-2.5 fill-current" />
                            </motion.span>
                          )}
                        </span>
                      </span>
                    )}
                  </div>
                  <span />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!nobodyLeft && worst.left > 0 && (
        <p className="mt-4 text-xs font-semibold text-slate-600">
          The biggest leak is at{' '}
          <span className="font-black text-rose-600">{worst.title.replace(/^\d+\. /, '')}</span>:{' '}
          {worst.left} of {worst.reached} people stopped there.
        </p>
      )}
    </Card>
  );
};
