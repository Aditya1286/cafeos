import { describe, it, expect } from 'vitest';
import { amendedMarks, addedLabel, amendedOrderPatch } from '../src/utils/amendedItems';

const A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const B = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const C = 'cccccccccccccccccccccccc';
const at1 = '2026-10-17T08:30:00.000Z';
const at2 = '2026-10-17T08:45:00.000Z';

describe('amendedMarks', () => {
  it('marks nothing on an order without amendments', () => {
    expect(amendedMarks({ items: [{ productId: A }] })).toEqual([null]);
    expect(amendedMarks(null)).toEqual([]);
  });

  it('marks the tail lines that match each amendment by position and productId', () => {
    const marks = amendedMarks({
      items: [{ productId: A }, { productId: B }, { productId: C }],
      amendments: [
        { at: at1, items: [{ productId: B }] },
        { at: at2, items: [{ productId: C }] },
      ],
    });
    expect(marks[0]).toBeNull();
    expect(marks[1]).toMatchObject({ at: at1 });
    expect(marks[2]).toMatchObject({ at: at2 });
    expect(marks[1]!.label.startsWith('Added ')).toBe(true);
  });

  it('marks the added copy, not an original line of the same dish', () => {
    const marks = amendedMarks({
      items: [{ productId: B }, { productId: B }],
      amendments: [{ at: at1, items: [{ productId: B }] }],
    });
    expect(marks).toEqual([null, expect.objectContaining({ at: at1 })]);
  });

  it('gives no marker when the lines do not line up', () => {
    expect(
      amendedMarks({ items: [{ productId: A }, { productId: C }], amendments: [{ at: at1, items: [{ productId: B }] }] }),
    ).toEqual([null, null]);
    expect(amendedMarks({ items: [], amendments: [{ at: at1, items: [{ productId: B }] }] })).toEqual([]);
  });

  it('accepts populated product ids', () => {
    const marks = amendedMarks({ items: [{ productId: { _id: B } }], amendments: [{ at: at1, items: [{ productId: B }] }] });
    expect(marks[0]).not.toBeNull();
  });
});

describe('addedLabel and amendedOrderPatch', () => {
  it('falls back to a bare label for a bad date', () => {
    expect(addedLabel('nope')).toBe('Added');
    expect(addedLabel(at1)).toMatch(/^Added \d{2}:\d{2}$/);
  });

  it('only patches lines and totals for an amend event', () => {
    expect(amendedOrderPatch({ orderStatus: 'READY' })).toEqual({});
    expect(amendedOrderPatch({ amended: true, items: [1], amendments: [2], totalAmountPaise: 500 })).toMatchObject({
      items: [1],
      amendments: [2],
      totalAmountPaise: 500,
    });
  });
});
