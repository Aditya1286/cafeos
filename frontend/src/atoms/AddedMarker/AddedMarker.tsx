import type { AddedMark } from '@/utils/amendedItems';

/** "Added 14:05" on an order line the guest added after placing (see utils/amendedItems.ts), so a
 * cook notices it on a ticket already in progress. Amber: it's a status cue, not the brand accent. */
export default function AddedMarker({ mark }: { mark: AddedMark | null | undefined }) {
  if (!mark) return null;
  return (
    <span
      data-testid="added-marker"
      title={`Added to the order at ${new Date(mark.at).toLocaleString('en-IN')}`}
      className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-wide align-middle whitespace-nowrap"
    >
      {mark.label}
    </span>
  );
}
