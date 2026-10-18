// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BottomSheet } from '../src/molecules/MobileList';
import { KdsOrderTicketCompact } from '../src/organisms/dashboard/KitchenKdsBoard/KdsOrderTicketCompact';

afterEach(cleanup);

describe('BottomSheet', () => {
  it('is never taller than the visible screen, and only its content scrolls', () => {
    render(
      <BottomSheet title="Filters" onClose={() => {}} footer={<button>Apply</button>}>
        <p>content</p>
      </BottomSheet>,
    );
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet.className).toContain('max-h-[90dvh]');
    expect(sheet.className).toContain('flex-col');
    const scroller = screen.getByText('content').parentElement!;
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.className).toContain('min-h-0');
  });

  it('keeps the title and the footer outside the scrolling part, so they are always in view', () => {
    render(
      <BottomSheet title="Filters" onClose={() => {}} footer={<button>Apply</button>}>
        <p>content</p>
      </BottomSheet>,
    );
    const scroller = screen.getByText('content').parentElement!;
    expect(scroller.contains(screen.getByRole('button', { name: 'Apply' }))).toBe(false);
    expect(scroller.contains(screen.getByText('Filters'))).toBe(false);
  });

  it('has no footer area when none is given, and closes from the X or from outside', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet title="Table 4" onClose={onClose}>
        <p>qr</p>
      </BottomSheet>,
    );
    expect(container.querySelector('[class*="border-t"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('KdsOrderTicketCompact details', () => {
  const order = {
    _id: 'o1',
    orderId: 'ART-1',
    customerName: 'Asha',
    customerPhone: '9876501234',
    tableName: 'Table 4',
    paymentStatus: 'PAID',
    totalAmountPaise: 25000,
    createdAt: new Date().toISOString(),
    items: [{ name: 'Latte', quantity: 1, pricePaise: 12000 }],
  };
  const ticket = (expanded: boolean) => (
    <KdsOrderTicketCompact
      order={order}
      status="PLACED"
      isNew={false}
      isSelected={false}
      expanded={expanded}
      onToggleExpanded={() => {}}
      onToggleSelected={() => {}}
      onAdvance={() => {}}
      onCancel={() => {}}
      onViewBill={() => {}}
      onConfirmPayment={() => {}}
      now={Date.now()}
    />
  );

  it('shows the customer, items and actions once opened', () => {
    render(ticket(true));
    expect(screen.getByText('Asha')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cancel order/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bill/ })).toBeTruthy();
  });

  it('keeps them out of the page while closed, and removes them again after closing', async () => {
    const { rerender } = render(ticket(false));
    expect(screen.queryByRole('button', { name: /Cancel order/ })).toBeNull();
    rerender(ticket(true));
    expect(screen.getByRole('button', { name: /Cancel order/ })).toBeTruthy();
    rerender(ticket(false));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Cancel order/ })).toBeNull());
  });

  it('always shows what to cook, open or closed', () => {
    const { rerender } = render(ticket(false));
    expect(screen.getByText('1× Latte')).toBeTruthy();
    rerender(ticket(true));
    expect(screen.getAllByText(/Latte/).length).toBeGreaterThan(0);
    expect(within(document.body).getByRole('button', { name: /Details/ })).toBeTruthy();
  });
});
