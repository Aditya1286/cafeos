// @vitest-environment jsdom
// The kitchen board's layout classes. jsdom cannot lay anything out, so these check the CSS classes
// that keep a long queue inside its column (measured in a real browser when they were added: with
// 15 orders the page was 3,721px tall instead of 1,196px before the column became positioned).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { KdsColumn } from '../src/organisms/dashboard/KitchenKdsBoard/KdsColumn';
import { KitchenKdsBoardMobile } from '../src/organisms/dashboard/KitchenKdsBoard/KitchenKdsBoardMobile';

afterEach(cleanup);

const viewProps = (orders: any[] = []) => ({
  orders,
  now: Date.now(),
  newlyArrivedOrderId: null,
  selectedIds: new Set<string>(),
  onToggleSelected: vi.fn(),
  onToggleSelectAll: vi.fn(),
  onClearSelection: vi.fn(),
  onSelectOldest: vi.fn(),
  onOpenBulkMove: vi.fn(),
  onUpdateStatus: vi.fn(),
  onCancel: vi.fn(),
  onViewBill: vi.fn(),
  onConfirmPayment: vi.fn(),
});

const column = (extra: object) =>
  render(<KdsColumn {...viewProps()} status="PLACED" scrollable={false} {...extra} />).container
    .firstElementChild as HTMLElement;
const scroller = (root: HTMLElement) => root.querySelector('[class*="overflow-y-auto"]');

describe('KdsColumn', () => {
  it('is a positioned, clipping container, so nothing inside it can stretch the page', () => {
    for (const extra of [{ scrollable: true }, { capped: true }, { scrollable: false }]) {
      const root = column(extra);
      expect(root.className).toContain('relative');
      expect(root.className).toContain('overflow-hidden');
      cleanup();
    }
  });

  it('desktop: a fixed height with its own scroll', () => {
    const root = column({ scrollable: true });
    expect(root.className).toContain('h-[600px]');
    expect(scroller(root)).toBeTruthy();
  });

  it('phone: grows with its orders up to 70% of the screen, then scrolls inside itself', () => {
    const root = column({ capped: true, compact: true });
    expect(root.className).toContain('max-h-[70dvh]');
    expect(root.className).not.toContain('h-[600px]');
    expect(scroller(root)).toBeTruthy();
  });

  it('phone: lets sideways swipes through the scrolling list, so swiping the orders changes status', () => {
    // A scrolling list takes over the touch; touch-pan-y hands horizontal swipes to the board.
    expect(scroller(column({ capped: true, compact: true }))!.className).toContain('touch-pan-y');
    expect(scroller(column({ scrollable: true }))!.className).not.toContain('touch-pan-y');
  });

  it('otherwise keeps its natural height', () => {
    const root = column({});
    expect(root.className).not.toContain('max-h-');
    expect(scroller(root)).toBeNull();
  });
});

const placed = (n: number) => ({
  _id: `o${n}`,
  orderId: `ART-${n}`,
  orderNumber: `${n}`,
  customerName: `Guest ${n}`,
  tableName: `Table ${n}`,
  orderStatus: 'PLACED',
  paymentStatus: 'PAID',
  paymentMethod: 'CASH',
  totalAmountPaise: 25000,
  createdAt: new Date().toISOString(),
  items: [{ name: 'Latte', quantity: 1, pricePaise: 12000 }],
});

describe('KdsColumn in Kitchen mode', () => {
  const wallColumn = (count: number) =>
    render(
      <KdsColumn
        {...viewProps(Array.from({ length: count }, (_, i) => placed(i + 1)))}
        status="PLACED"
        scrollable={false}
        wall
      />,
    ).container.firstElementChild as HTMLElement;

  it('gives a lone ticket the whole column, instead of half of it on a very wide screen', () => {
    const list = scroller(wallColumn(1))!;
    expect(list.className).toContain('grid-cols-1');
    expect(list.className).not.toContain('2xl:grid-cols-2');
  });

  it('puts two tickets across on a very wide screen once there is more than one', () => {
    for (const count of [2, 3, 7]) {
      expect(scroller(wallColumn(count))!.className).toContain('2xl:grid-cols-2');
      cleanup();
    }
  });
});

describe('KitchenKdsBoardMobile', () => {
  it('shows its column capped, so a rush never stretches the page', () => {
    const { container } = render(<KitchenKdsBoardMobile {...viewProps()} />);
    expect(container.querySelector('[class*="max-h-[70dvh]"]')).toBeTruthy();
  });
});
