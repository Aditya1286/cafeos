// Lines a guest added to an order already placed (the amend flow, spec §10.7). The backend appends
// each amendment's lines to `order.items` in order, so the tail of `items` is the amendments'
// lines, flattened. A line counts as added only when its position AND productId agree with that
// record; anything that doesn't line up gets no marker rather than a wrong one.

export interface AddedMark {
  /** When it was added (ISO string from the server). */
  at: string;
  /** "Added 14:05", for the ticket. */
  label: string;
}

const idOf = (v: unknown): string => (v && typeof v === 'object' ? String((v as any)._id ?? v) : String(v ?? ''));

export const addedLabel = (at: string | Date): string => {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return 'Added';
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `Added ${time}`;
};

/** One entry per `order.items` line: its "Added" mark, or null for a line from the original order. */
export const amendedMarks = (order: { items?: any[]; amendments?: any[] } | null | undefined): (AddedMark | null)[] => {
  const items = order?.items ?? [];
  const marks: (AddedMark | null)[] = items.map(() => null);
  const added: { productId: string; at: string }[] = [];
  for (const a of order?.amendments ?? []) {
    for (const it of a?.items ?? []) added.push({ productId: idOf(it?.productId), at: String(a.at) });
  }
  if (added.length === 0 || added.length > items.length) return marks;
  const offset = items.length - added.length;
  added.forEach((a, i) => {
    if (idOf(items[offset + i]?.productId) === a.productId) {
      marks[offset + i] = { at: a.at, label: addedLabel(a.at) };
    }
  });
  return marks;
};

/** The fields an `order:updated` from the amend flow carries, to merge into a live order. */
export const amendedOrderPatch = (updated: any): Record<string, unknown> =>
  updated?.amended
    ? {
        items: updated.items,
        amendments: updated.amendments,
        subtotalPaise: updated.subtotalPaise,
        taxPaise: updated.taxPaise,
        totalAmountPaise: updated.totalAmountPaise,
        businessEarningsPaise: updated.businessEarningsPaise,
      }
    : {};
