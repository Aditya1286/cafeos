import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface FunnelProgressProps {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
}

/** "Back", "3 of 8" and the bar. The bar starts part-filled: the first tap already feels like progress. */
export const FunnelProgress: React.FC<FunnelProgressProps> = ({
  stepIndex,
  totalSteps,
  onBack,
}) => {
  const percent = Math.round(((stepIndex + 1) / totalSteps) * 100);
  return (
    <div className="mb-5 sm:mb-6">
      <div className="flex items-center justify-between h-8 mb-2">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <span className="text-xs font-bold text-red-600">Free trial · about a minute</span>
        )}
        <span className="text-xs font-bold text-slate-400 tabular-nums">
          {stepIndex + 1} of {totalSteps}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progress"
      >
        <div
          className="h-full rounded-full bg-red-600 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
