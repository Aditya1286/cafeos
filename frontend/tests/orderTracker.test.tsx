// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  OrderTrackerDesktop,
  OrderTrackerMobile,
  resolveTrackerTab,
  OrderTrackerSections,
} from '../src/organisms/customer-order/OrderTracker';

afterEach(cleanup);

const sections = (over: Partial<OrderTrackerSections> = {}): OrderTrackerSections => ({
  status: <p>STATUS</p>,
  bill: <p>BILL</p>,
  wait: <p>WAIT</p>,
  showWait: true,
  orders: <p>ORDERS</p>,
  ordersCount: 2,
  ...over,
});

describe('OrderTrackerDesktop', () => {
  it('stacks everything on one page, in the order the page always had', () => {
    const { container } = render(<OrderTrackerDesktop sections={sections()} />);
    expect(container.textContent).toBe('STATUSWAITORDERSBILL');
  });

  it('leaves out what the order does not have', () => {
    const { container } = render(
      <OrderTrackerDesktop sections={sections({ showWait: false, ordersCount: 0 })} />,
    );
    expect(container.textContent).toBe('STATUSBILL');
  });

  it('has no tabs', () => {
    render(<OrderTrackerDesktop sections={sections()} />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('OrderTrackerMobile', () => {
  it('shows one section at a time, starting with the status', () => {
    render(<OrderTrackerMobile sections={sections()} tab="status" onTabChange={() => {}} />);
    expect(screen.getByText('STATUS')).toBeTruthy();
    expect(screen.queryByText('BILL')).toBeNull();
    expect(screen.queryByText('ORDERS')).toBeNull();
  });

  it('has a tab for each section the order has, with the count on the other orders', () => {
    render(<OrderTrackerMobile sections={sections()} tab="status" onTabChange={() => {}} />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Status',
      'Bill',
      'While you wait',
      'My orders2',
    ]);
  });

  it('drops the tabs the order does not need', () => {
    render(
      <OrderTrackerMobile
        sections={sections({ showWait: false, ordersCount: 0 })}
        tab="status"
        onTabChange={() => {}}
      />,
    );
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Status', 'Bill']);
  });

  it('opens the bill without scrolling, and tells the page which tab was picked', () => {
    const onTabChange = vi.fn();
    const { rerender } = render(
      <OrderTrackerMobile sections={sections()} tab="status" onTabChange={onTabChange} />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Bill' }));
    expect(onTabChange).toHaveBeenCalledWith('bill');

    rerender(<OrderTrackerMobile sections={sections()} tab="bill" onTabChange={onTabChange} />);
    expect(screen.getByText('BILL')).toBeTruthy();
  });

  it('falls back to the status when the chosen tab is gone', () => {
    expect(resolveTrackerTab('orders', sections({ ordersCount: 0 }))).toBe('status');
    expect(resolveTrackerTab('orders', sections())).toBe('orders');
    expect(resolveTrackerTab('wait', sections({ showWait: false }))).toBe('status');
  });
});
