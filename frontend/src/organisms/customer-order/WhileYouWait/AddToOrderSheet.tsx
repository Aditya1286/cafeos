import React, { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { Pairing } from '@/services/public/whileYouWait';
import { rupees, totalAfterAdding } from './money';

// A guest adds at most a handful from here; the server caps additions per order anyway.
const MAX_QUANTITY = 5;

interface AddToOrderSheetProps {
  pairing: Pairing;
  subtotalPaise: number;
  taxRatePercentage: number;
  onConfirm: (quantity: number) => Promise<void>;
  onClose: () => void;
}

/** The small confirm sheet: the dish, its price, the quantity and the order's new total. The tracker
 * never navigates away. */
export const AddToOrderSheet: React.FC<AddToOrderSheetProps> = ({
  pairing,
  subtotalPaise,
  taxRatePercentage,
  onConfirm,
  onClose,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newTotal = totalAfterAdding(subtotalPaise, pairing.pricePaise * quantity, taxRatePercentage);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(quantity);
    } catch (err: any) {
      setError(err?.message || 'Could not add it. Please ask your server.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Add ${pairing.name} to your order`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-cafe-surface text-cafe-ink rounded-t-cafe-card border-t border-cafe-line shadow-2xl p-5 pb-7 space-y-4 font-cafe-body"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black font-cafe-display text-cafe-ink">{pairing.name}</h3>
            <p className="text-xs font-bold text-cafe-muted">{rupees(pairing.pricePaise)} each</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full text-cafe-muted hover:bg-cafe-raised"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cafe-neutral-700">Quantity</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="One less"
              disabled={quantity <= 1 || busy}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full bg-cafe-raised text-cafe-ink flex items-center justify-center disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-5 text-center text-sm font-black tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="One more"
              disabled={quantity >= MAX_QUANTITY || busy}
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              className="w-8 h-8 rounded-full bg-cafe-raised text-cafe-ink flex items-center justify-center disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-cafe-line text-sm font-black">
          <span>New order total</span>
          <span data-testid="new-total">{rupees(newTotal)}</span>
        </div>

        {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="w-full py-3.5 rounded-cafe-button bg-cafe-button text-cafe-on-accent text-xs font-black uppercase tracking-wider disabled:opacity-60"
        >
          {busy ? 'Adding…' : 'Add to my order'}
        </button>
      </div>
    </div>
  );
};

export default AddToOrderSheet;
