// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { OrderHistoryPanel } from '../src/organisms/dashboard/OrderHistoryPanel';
import { OrderHistoryPanelMobile } from '../src/organisms/dashboard/OrderHistoryPanel/OrderHistoryPanelMobile';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const order = (over: object = {}) => ({
  _id: 'o1',
  orderId: 'ART-181026-01',
  customerName: 'Asha',
  tableName: 'Table 4',
  totalAmountPaise: 45000,
  orderStatus: 'PLACED',
  paymentStatus: 'UNPAID',
  paymentMethod: 'CASH',
  createdAt: '2026-10-18T10:30:00.000Z',
  items: [{ name: 'Latte', quantity: 1 }],
  ...over,
});

const makeProps = (over: object = {}) => ({
  business: { shortCode: 'ART', timezone: 'Asia/Kolkata' },
  orderHistory: [
    order(),
    order({
      _id: 'o2',
      orderId: 'ART-181026-02',
      customerName: 'Ravi',
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
    }),
  ],
  todaySalesPaise: 123400 as number | null,
  loadingHistory: false,
  pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  filters: {
    orderSearchQuery: '',
    setOrderSearchQuery: vi.fn(),
    selectedStatusFilter: 'ALL',
    setSelectedStatusFilter: vi.fn(),
    selectedPaymentFilter: 'ALL',
    setSelectedPaymentFilter: vi.fn(),
    selectedMethodFilter: 'ALL',
    setSelectedMethodFilter: vi.fn(),
    selectedDateFilter: 'ALL' as const,
    setSelectedDateFilter: vi.fn(),
  },
  onRefresh: vi.fn(),
  onOpenDrawer: vi.fn(),
  onOpenBill: vi.fn(),
  onCancel: vi.fn(),
  onMarkRefunded: vi.fn(),
  onConfirmPayment: vi.fn(),
  ...over,
});

describe('OrderHistoryPanelMobile', () => {
  it('keeps the overview closed, as one line, until it is tapped', () => {
    render(<OrderHistoryPanelMobile {...makeProps()} />);
    expect(screen.getByText(/25 orders/)).toBeTruthy();
    expect(screen.queryByText('Total Orders')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /25 orders/ }));
    expect(screen.getByText('Total Orders')).toBeTruthy();
    expect(screen.getByText(/start again from 01 each day/)).toBeTruthy();
  });

  it("leaves out the day's sales for staff", () => {
    render(<OrderHistoryPanelMobile {...makeProps({ todaySalesPaise: null })} />);
    expect(screen.getByText('25 orders').textContent).not.toMatch(/today/);
  });

  it('shows no filter dropdowns until Filters is opened', () => {
    render(<OrderHistoryPanelMobile {...makeProps()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(screen.getByRole('dialog', { name: 'Filter orders' })).toBeTruthy();
  });

  it('applies the sheet in one go, and not before', () => {
    const props = makeProps();
    render(<OrderHistoryPanelMobile {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const dialog = screen.getByRole('dialog');
    const [date, payment] = within(dialog).getAllByRole('combobox');
    fireEvent.change(date, { target: { value: 'TODAY' } });
    fireEvent.change(payment, { target: { value: 'PAID' } });
    expect(props.filters.setSelectedDateFilter).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Show orders' }));
    expect(props.filters.setSelectedDateFilter).toHaveBeenCalledWith('TODAY');
    expect(props.filters.setSelectedPaymentFilter).toHaveBeenCalledWith('PAID');
    expect(props.filters.setSelectedMethodFilter).toHaveBeenCalledWith('ALL');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the filters that are on as chips, with a count, and removes one with a tap', () => {
    const props = makeProps();
    props.filters.selectedPaymentFilter = 'PAID';
    props.filters.selectedDateFilter = 'TODAY' as never;
    render(<OrderHistoryPanelMobile {...props} />);
    expect(screen.getByRole('button', { name: /Filters/ }).textContent).toMatch(/2/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Paid' }));
    expect(props.filters.setSelectedPaymentFilter).toHaveBeenCalledWith('ALL');
  });

  it('filters by status with one tap on a pill', () => {
    const props = makeProps();
    props.filters.selectedStatusFilter = 'READY';
    render(<OrderHistoryPanelMobile {...props} />);
    expect(screen.getByRole('button', { name: 'Ready' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(props.filters.setSelectedStatusFilter).toHaveBeenCalledWith('PLACED');
  });

  it('searches as you type', () => {
    const props = makeProps();
    render(<OrderHistoryPanelMobile {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Search order/), { target: { value: 'asha' } });
    expect(props.filters.setOrderSearchQuery).toHaveBeenCalledWith('asha');
  });

  it('opens an order from its row, and its bill without opening the order', () => {
    const props = makeProps();
    render(<OrderHistoryPanelMobile {...props} />);
    fireEvent.click(screen.getByText('ART-181026-02'));
    expect(props.onOpenDrawer).toHaveBeenCalledWith(expect.objectContaining({ _id: 'o2' }));

    props.onOpenDrawer.mockClear();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open bill' })[0]);
    expect(props.onOpenBill).toHaveBeenCalledWith('ART-181026-01');
    expect(props.onOpenDrawer).not.toHaveBeenCalled();
  });

  it('offers actions only on orders they apply to, and runs the chosen one', () => {
    const props = makeProps();
    render(<OrderHistoryPanelMobile {...props} />);
    // The unpaid, placed order can be confirmed or cancelled; the paid, completed one cannot.
    const more = screen.getAllByRole('button', { name: 'More actions' });
    expect(more).toHaveLength(1);
    fireEvent.click(more[0]);
    fireEvent.click(screen.getByRole('button', { name: /Cancel Order/ }));
    expect(props.onCancel).toHaveBeenCalledWith(expect.objectContaining({ _id: 'o1' }));
  });

  it('pages through the orders, and stops at the ends', () => {
    const props = makeProps();
    const { rerender } = render(<OrderHistoryPanelMobile {...props} />);
    expect((screen.getByRole('button', { name: /Prev/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(props.onPageChange).toHaveBeenCalledWith(2);

    rerender(<OrderHistoryPanelMobile {...props} pagination={{ ...props.pagination, page: 3 }} />);
    expect((screen.getByRole('button', { name: /Next/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says so when nothing matches', () => {
    render(<OrderHistoryPanelMobile {...makeProps({ orderHistory: [] })} />);
    expect(screen.getByText('No matching orders found')).toBeTruthy();
  });
});

describe('the Orders tab chooses one layout by screen size', () => {
  const stubScreen = (mobile: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: mobile,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));

  it('gives phones the mobile panel', () => {
    stubScreen(true);
    render(<OrderHistoryPanel {...makeProps()} />);
    expect(screen.getByRole('button', { name: /Filters/ })).toBeTruthy();
    expect(screen.queryByText('E-BILL READY')).toBeNull();
  });

  it('gives everything else the original panel', () => {
    stubScreen(false);
    render(<OrderHistoryPanel {...makeProps()} />);
    expect(screen.getByText('E-BILL READY')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Filters/ })).toBeNull();
  });
});
