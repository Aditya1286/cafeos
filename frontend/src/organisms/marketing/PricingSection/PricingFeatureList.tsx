import React, { useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface PricingFeatureListProps {
  items: string[];
  /** On phones, show this many and fold the rest behind a toggle. Tablets and up show everything. */
  phoneVisible?: number;
}

/** A plan's feature list. On a phone the cards stack, so two full lists make the pricing section
 * several screens long: the extras fold away behind "Show all N" until asked for. */
export const PricingFeatureList: React.FC<PricingFeatureListProps> = ({
  items,
  phoneVisible = 5,
}) => {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const folded = items.length - phoneVisible;

  return (
    <>
      <ul id={listId} className="space-y-3 text-sm text-slate-700">
        {items.map((item, idx) => (
          <li
            key={item}
            className={`items-start gap-2.5 ${
              !expanded && idx >= phoneVisible ? 'hidden md:flex' : 'flex'
            }`}
          >
            <Check className="w-4 h-4 text-red-600 shrink-0 mt-0.5 stroke-[2.5]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {folded > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className="md:hidden mt-4 inline-flex items-center gap-1 self-start text-xs font-bold text-red-700"
        >
          {expanded ? 'Show fewer' : `Show all ${items.length} features`}
          <ChevronDown
            aria-hidden="true"
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </>
  );
};

export default PricingFeatureList;
