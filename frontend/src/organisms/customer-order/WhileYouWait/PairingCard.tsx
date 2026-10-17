import React from 'react';
import { Plus } from 'lucide-react';
import type { Pairing } from '@/services/public/whileYouWait';
import { rupees } from './money';

interface PairingCardProps {
  pairing: Pairing;
  onAdd: (pairing: Pairing) => void;
}

/** "Goes well with your order": the server's line, the dish and its price, and Add when the order
 * can still take it (otherwise the guest asks their server). */
export const PairingCard: React.FC<PairingCardProps> = ({ pairing, onAdd }) => (
  <div className="flex items-center justify-between gap-3 p-3.5 rounded-cafe-card bg-cafe-surface border border-cafe-line">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-cafe-neutral-700 leading-snug">{pairing.line}</p>
      <p className="mt-1 text-[11px] font-bold text-cafe-muted">
        {pairing.name} · {rupees(pairing.pricePaise)}
      </p>
      {!pairing.addable && (
        <p className="mt-1 text-[11px] font-semibold text-cafe-muted">Ask your server to add it</p>
      )}
    </div>
    {pairing.addable && (
      <button
        type="button"
        onClick={() => onAdd(pairing)}
        aria-label={`Add ${pairing.name}`}
        className="shrink-0 inline-flex items-center gap-1 px-3.5 h-9 rounded-cafe-button bg-cafe-button text-cafe-on-accent text-xs font-black active:scale-95 transition-transform"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        Add
      </button>
    )}
  </div>
);

export default PairingCard;
