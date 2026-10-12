import React, { useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { TourStep, TourScreenId } from '@/constants/productTour';

interface TourTabsProps {
  steps: TourStep[];
  active: TourScreenId;
  onSelect: (id: TourScreenId) => void;
  panelId: string;
}

/** Tab list for the product tour. On large screens it is a vertical list where the active row
 * shows its description and bullet points; on small screens it is a row of chips (the
 * description is rendered separately under the stage, so nothing above the stage changes size). */
export const TourTabs: React.FC<TourTabsProps> = ({ steps, active, onSelect, panelId }) => {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = steps.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (index + 1) % steps.length
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (index - 1 + steps.length) % steps.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    onSelect(steps[next].id);
    refs.current[steps[next].id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Product tour"
      className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0"
    >
      {steps.map((step, index) => {
        const selected = step.id === active;
        return (
          <button
            key={step.id}
            ref={(el) => {
              refs.current[step.id] = el;
            }}
            role="tab"
            type="button"
            id={`tour-tab-${step.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(step.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`shrink-0 text-left rounded-2xl border transition-colors px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
              selected
                ? 'bg-white border-red-200 shadow-md shadow-red-600/5'
                : 'bg-transparent border-transparent hover:bg-white/70'
            }`}
          >
            <span
              className={`block text-sm font-bold ${selected ? 'text-slate-900' : 'text-slate-500'}`}
            >
              {step.tab}
            </span>

            <span
              className={`hidden lg:grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
                selected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <span className="min-h-0 overflow-hidden">
                <span className="block pt-2 text-[15px] font-extrabold text-slate-900 leading-snug">
                  {step.title}
                </span>
                <span className="block pt-1.5 text-sm text-slate-600 font-medium leading-relaxed">
                  {step.body}
                </span>
                <span className="block pt-3 space-y-1.5">
                  {step.points.map((p) => (
                    <span
                      key={p}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" /> {p}
                    </span>
                  ))}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
