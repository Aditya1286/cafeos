// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RefundsPanel } from '../src/organisms/dashboard/RefundsPanel';
import { RefundsPanelMobile } from '../src/organisms/dashboard/RefundsPanel/RefundsPanelMobile';
import { TablesQrPanel } from '../src/organisms/dashboard/TablesQrPanel';
import { TablesQrPanelMobile } from '../src/organisms/dashboard/TablesQrPanel/TablesQrPanelMobile';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stubScreen = (mobile: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: mobile,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));

// ── Refunds & cancellations ───────────────────────────────────────────────

const refundOrder = (over: object = {}) => ({
  _id: 'r1',
  orderId: 'ART-181026-07',
  customerName: 'Meera',
  totalAmountPaise: 32000,
  orderStatus: 'CANCELLED',
  paymentStatus: 'PAID',
  createdAt: '2026-10-18T10:30:00.000Z',
  refundReason: 'Waited too long',
  ...over,
});

const refundProps = (over: object = {}) => ({
  orders: [
    refundOrder(),
    refundOrder({
      _id: 'r2',
      orderId: 'ART-181026-08',
      customerName: 'Dev',
      paymentStatus: 'REFUNDED',
      refundReason: '',
    }),
  ],
  loading: false,
  insights: {
    totalCancellations: 12,
    unpaidCancellationsCount: 3,
    needsRefundCount: 2,
    refundRequestedCount: 1,
    totalRefundedCount: 7,
    totalRefundedAmountPaise: 210000,
    avgRefundTurnaroundHours: 4,
    paymentMethodBreakdown: [{ _id: 'ONLINE', count: 5, amountPaise: 150000 }],
  } as any,
  pagination: { page: 1, limit: 10, total: 12, totalPages: 2 },
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  paymentStatusFilter: 'ALL',
  onPaymentStatusFilterChange: vi.fn(),
  onRefresh: vi.fn(),
  onViewHistory: vi.fn(),
  onMarkRefunded: vi.fn(),
  ...over,
});

describe('RefundsPanelMobile', () => {
  it('keeps the overview closed, as one line, until it is tapped', () => {
    render(<RefundsPanelMobile {...refundProps()} />);
    expect(screen.getByText(/12 cancellations/)).toBeTruthy();
    expect(screen.queryByText('Avg. time to refund')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /12 cancellations/ }));
    expect(screen.getByText('Avg. time to refund')).toBeTruthy();
    expect(screen.getByText('ONLINE')).toBeTruthy();
  });

  it('filters by payment status with one tap on a pill', () => {
    const props = refundProps();
    render(<RefundsPanelMobile {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Needs refund' }));
    expect(props.onPaymentStatusFilterChange).toHaveBeenCalledWith('PAID');
  });

  it('searches as you type', () => {
    const props = refundProps();
    render(<RefundsPanelMobile {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Search order/), { target: { value: 'meera' } });
    expect(props.onSearchChange).toHaveBeenCalledWith('meera');
  });

  it('offers Mark Refunded only on a paid, cancelled order', () => {
    const props = refundProps();
    render(<RefundsPanelMobile {...props} />);
    expect(screen.getAllByRole('button', { name: /Mark Refunded/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Mark Refunded/ }));
    expect(props.onMarkRefunded).toHaveBeenCalledWith(expect.objectContaining({ _id: 'r1' }));
    fireEvent.click(screen.getAllByRole('button', { name: /History/ })[1]);
    expect(props.onViewHistory).toHaveBeenCalledWith(expect.objectContaining({ _id: 'r2' }));
  });

  it('works without insights, and pages through the list', () => {
    const props = refundProps({ insights: null });
    render(<RefundsPanelMobile {...props} />);
    expect(screen.getByText('Refunds & cancellations')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });

  it('is chosen on phones, and the original panel everywhere else', () => {
    stubScreen(true);
    const { unmount } = render(<RefundsPanel {...refundProps()} />);
    expect(screen.getByRole('button', { name: 'Needs refund' })).toBeTruthy();
    unmount();
    stubScreen(false);
    render(<RefundsPanel {...refundProps()} />);
    expect(screen.getByText('Refunds & Cancellations')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Needs refund' })).toBeNull();
  });
});

// ── Tables & QR ───────────────────────────────────────────────────────────

const table = (n: number, over: object = {}) => ({
  _id: `t${n}`,
  tableNumber: `Table ${n}`,
  qrToken: `tok${n}`,
  status: 'AVAILABLE',
  isActive: true,
  ...over,
});

const tableProps = (over: object = {}) => ({
  tables: [table(1), table(2, { status: 'OCCUPIED' }), table(3, { isActive: false })],
  business: { slug: 'brew-house' },
  tablesEnabled: true,
  savingTablesEnabled: false,
  onToggleTablesEnabled: vi.fn(),
  menuUrl: 'https://caos.test/c/brew-house',
  masterQrEnabled: true,
  savingMasterQr: false,
  onToggleMasterQr: vi.fn(),
  onAddTable: vi.fn(),
  onToggleTableActive: vi.fn(),
  onDeleteTable: vi.fn(),
  onMarkTableEmpty: vi.fn(),
  ...over,
});

describe('TablesQrPanelMobile', () => {
  it('keeps the settings and master QR closed until the overview is tapped', () => {
    render(<TablesQrPanelMobile {...tableProps()} />);
    expect(screen.getByText(/3 tables/)).toBeTruthy();
    expect(screen.queryByText('Master QR')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /3 tables/ }));
    expect(screen.getByText('Master QR')).toBeTruthy();
  });

  it('lists the tables as short rows, with no QR codes until one is opened', () => {
    const { container } = render(<TablesQrPanelMobile {...tableProps()} />);
    expect(screen.getByText('Table 1')).toBeTruthy();
    expect(
      container.querySelectorAll('canvas, svg[role="img"], svg[viewBox="0 0 29 29"]').length,
    ).toBe(0);
  });

  it('filters by status with the pills', () => {
    render(<TablesQrPanelMobile {...tableProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Occupied\s*\d/ }));
    expect(screen.getByText('Table 2')).toBeTruthy();
    expect(screen.queryByText('Table 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Disabled\s*\d/ }));
    expect(screen.getByText('Table 3')).toBeTruthy();
    expect(screen.queryByText('Table 2')).toBeNull();
  });

  it('keeps the Add button its own size when the overview opens', () => {
    render(<TablesQrPanelMobile {...tableProps()} />);
    const row = screen.getByRole('button', { name: /Add/ }).parentElement!;
    // A row that stretches its children would make the button as tall as the opened overview.
    expect(row.className).toContain('items-start');
    expect(row.className).not.toContain('items-stretch');
    fireEvent.click(screen.getByRole('button', { name: /3 tables/ }));
    expect(screen.getByRole('button', { name: /Add/ }).className).toContain('h-[42px]');
  });

  it('adds a table from the top, but not for view-only staff', () => {
    const props = tableProps();
    const { unmount } = render(<TablesQrPanelMobile {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    expect(props.onAddTable).toHaveBeenCalled();
    unmount();
    render(<TablesQrPanelMobile {...tableProps({ readOnly: true })} />);
    expect(screen.queryByRole('button', { name: /^Add/ })).toBeNull();
  });

  it('opens a table to show its QR and actions, and asks before deleting', () => {
    const props = tableProps();
    render(<TablesQrPanelMobile {...props} />);
    fireEvent.click(screen.getByText('Table 2'));
    const sheet = screen.getByRole('dialog', { name: 'Table 2' });
    expect(
      within(sheet)
        .getByRole('link', { name: /Open menu/ })
        .getAttribute('href'),
    ).toMatch(/\/c\/brew-house\/t\/tok2$/);

    fireEvent.click(within(sheet).getByRole('button', { name: /Delete/ }));
    expect(props.onDeleteTable).not.toHaveBeenCalled();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Yes, Delete' }));
    expect(props.onDeleteTable).toHaveBeenCalledWith('t2');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks an occupied table empty after confirming, and disables a free one at once', () => {
    const props = tableProps();
    const { unmount } = render(<TablesQrPanelMobile {...props} />);
    fireEvent.click(screen.getByText('Table 2'));
    const sheet2 = screen.getByRole('dialog', { name: 'Table 2' });
    fireEvent.click(within(sheet2).getByRole('button', { name: /Mark empty/ }));
    fireEvent.click(within(sheet2).getByRole('button', { name: 'Yes, Mark Empty' }));
    expect(props.onMarkTableEmpty).toHaveBeenCalledWith('t2');
    unmount();

    render(<TablesQrPanelMobile {...props} />);
    fireEvent.click(screen.getByText('Table 1'));
    const sheet = screen.getByRole('dialog', { name: 'Table 1' });
    expect(within(sheet).queryByRole('button', { name: /Mark empty/ })).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: /Disable/ }));
    expect(props.onToggleTableActive).toHaveBeenCalledWith('t1');
  });

  it('shows staff the QR and menu link, but none of the controls', () => {
    render(<TablesQrPanelMobile {...tableProps({ readOnly: true })} />);
    fireEvent.click(screen.getByText('Table 2'));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('link', { name: /Open menu/ })).toBeTruthy();
    expect(within(sheet).queryByRole('button', { name: /Delete|Disable|Mark empty/ })).toBeNull();
  });

  it('says so when tables are switched off', () => {
    render(<TablesQrPanelMobile {...tableProps({ tablesEnabled: false })} />);
    expect(screen.getByText('Tables are disabled for this business')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Add/ })).toBeNull();
  });

  it('is chosen on phones, and the original panel everywhere else', () => {
    stubScreen(true);
    const { unmount } = render(<TablesQrPanel {...tableProps()} />);
    expect(screen.getByRole('button', { name: /^Occupied\s*\d/ })).toBeTruthy();
    unmount();
    stubScreen(false);
    render(<TablesQrPanel {...tableProps()} />);
    expect(screen.getByText('Tables & QR Codes')).toBeTruthy();
  });
});
