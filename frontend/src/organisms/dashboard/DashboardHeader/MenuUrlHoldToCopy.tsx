import React from 'react';
import { Check } from 'lucide-react';
import { useLongPress, LONG_PRESS_MS } from '@/hooks/useLongPress';
import { toast } from '@/utils/toast';

interface MenuUrlHoldToCopyProps {
  slug: string;
  copied: boolean;
  onCopy: () => void;
}

/** The public menu path under the business name — press and hold it to copy the full URL.
 * A quick tap just explains the gesture; keyboard activation (Enter/Space) copies directly,
 * since a keyboard can't "hold". */
export const MenuUrlHoldToCopy = ({ slug, copied, onCopy }: MenuUrlHoldToCopyProps) => {
  const copy = () => {
    navigator.vibrate?.(30);
    onCopy();
  };

  const { holding, handlers } = useLongPress(copy, {
    onShortPress: (e) => {
      if (e.detail === 0) copy();
      else toast('Press and hold the link to copy it');
    },
  });

  return (
    <button
      type="button"
      {...handlers}
      aria-label={`Menu link /c/${slug} — press and hold to copy`}
      title="Press and hold to copy"
      className="relative overflow-hidden flex items-center gap-1 max-w-full -mx-1.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors select-none [-webkit-touch-callout:none]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-orange-500/25"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${LONG_PRESS_MS}ms linear` : 'none' }}
      />
      <span className="relative truncate">/c/{slug}</span>
      {copied && (
        <span className="relative flex items-center gap-0.5 text-emerald-400 font-bold shrink-0">
          <Check className="w-3 h-3" /> Copied
        </span>
      )}
    </button>
  );
};

export default MenuUrlHoldToCopy;
