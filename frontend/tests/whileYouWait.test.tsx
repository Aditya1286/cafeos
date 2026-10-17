// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { get, answer, addItems, recordEvent, readGuestPass } = vi.hoisted(() => ({
  get: vi.fn(),
  answer: vi.fn(),
  addItems: vi.fn(),
  recordEvent: vi.fn(),
  readGuestPass: vi.fn(),
}));
vi.mock('@/services/public/whileYouWait', () => ({ default: { get, answer, addItems } }));
vi.mock('@/services/public/guest', () => ({ default: { recordEvent } }));
vi.mock('@/utils/guestPass', () => ({ readGuestPass }));

import { useWhileYouWait } from '@/hooks/useWhileYouWait';
import { WhileYouWait } from '@/organisms/customer-order/WhileYouWait';

const ORDER = 'b'.repeat(24);
const BIZ = 'a'.repeat(24);
const bunMaska = {
  productId: 'p-bun',
  name: 'Bun Maska',
  pricePaise: 6000,
  line: 'Goes well with your masala chai: Bun Maska',
  addable: true,
};
const question = {
  id: 'chai-mood',
  text: 'Kadak or meetha?',
  options: [
    { id: 'kadak', label: 'Kadak', emoji: '💪' },
    { id: 'meetha', label: 'Meetha', emoji: '🍯' },
  ],
};

const Harness: React.FC<{ status: string; onOrderChanged?: () => void }> = ({ status, onOrderChanged }) => {
  const wait = useWhileYouWait(ORDER, status, BIZ, { onOrderChanged });
  return (
    <>
      <WhileYouWait wait={wait} subtotalPaise={20000} taxRatePercentage={5} />
      <output data-testid="reply">{wait.mascotReply ?? ''}</output>
    </>
  );
};

const serve = (data: object) => get.mockResolvedValue({ success: true, data });

beforeEach(() => {
  get.mockReset();
  answer.mockReset();
  addItems.mockReset();
  recordEvent.mockReset();
  readGuestPass.mockReset().mockReturnValue('t.o.k');
});
afterEach(cleanup);

describe('While you wait', () => {
  it('is hidden and fetches nothing once the order is READY', async () => {
    serve({ pairings: [bunMaska], question });
    render(<Harness status="READY" />);
    await act(async () => {});
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByText('While you wait')).toBeNull();
  });

  it('hides again when the status moves on to READY', async () => {
    serve({ pairings: [bunMaska], question });
    const { rerender } = render(<Harness status="PREPARING" />);
    await screen.findByText('While you wait');
    rerender(<Harness status="READY" />);
    expect(screen.queryByText('While you wait')).toBeNull();
  });

  it('refetches when the status changes', async () => {
    serve({ pairings: [bunMaska], question: null });
    const { rerender } = render(<Harness status="PLACED" />);
    await screen.findByText(bunMaska.line);
    rerender(<Harness status="PREPARING" />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it('an addable pairing offers Add: the sheet shows the price and new total, and confirming adds it', async () => {
    serve({ pairings: [bunMaska], question: null });
    addItems.mockResolvedValue({ success: true });
    const onOrderChanged = vi.fn();
    render(<Harness status="PLACED" onOrderChanged={onOrderChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Bun Maska' }));

    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain('₹60 each');
    // (200 + 60) + 5% tax = 273
    expect(screen.getByTestId('new-total').textContent).toBe('₹273');
    fireEvent.click(screen.getByRole('button', { name: 'One more' }));
    // (200 + 120) + 5% = 336
    expect(screen.getByTestId('new-total').textContent).toBe('₹336');

    fireEvent.click(screen.getByRole('button', { name: 'Add to my order' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(addItems).toHaveBeenCalledWith(ORDER, 't.o.k', [{ productId: 'p-bun', quantity: 2 }]);
    expect(onOrderChanged).toHaveBeenCalled();
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'pairing_added', orderId: ORDER });
  });

  it('a failed add keeps the sheet open with the reason', async () => {
    serve({ pairings: [bunMaska], question: null });
    addItems.mockRejectedValue(Object.assign(new Error('This order can no longer be changed.'), { code: 'ORDER_NOT_AMENDABLE' }));
    render(<Harness status="PLACED" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Bun Maska' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to my order' }));
    await screen.findByText('This order can no longer be changed.');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('a pairing that can’t be added says to ask the server, with no button', async () => {
    serve({ pairings: [{ ...bunMaska, addable: false }], question: null });
    render(<Harness status="PREPARING" />);
    await screen.findByText('Ask your server to add it');
    expect(screen.queryByRole('button', { name: /Add/ })).toBeNull();
  });

  it('answering calls answer, collapses to "Answered ✓" and sets the mascot reply', async () => {
    serve({ pairings: [], question });
    answer.mockResolvedValue({ success: true, data: { reply: 'Kadak it is. Strong choice.', gesture: 'nod' } });
    render(<Harness status="PLACED" />);
    fireEvent.click(await screen.findByRole('button', { name: /Kadak/ }));
    await screen.findByText(/Answered ✓/);
    expect(answer).toHaveBeenCalledWith(ORDER, 't.o.k', { questionId: 'chai-mood', optionId: 'kadak' });
    expect(screen.queryByText(question.text)).toBeNull();
    expect(screen.getByTestId('reply').textContent).toBe('Kadak it is. Strong choice.');
    expect(recordEvent).toHaveBeenCalledWith({ businessId: BIZ, kind: 'question_answered', orderId: ORDER });
  });

  it('"Not now" hides the question without answering', async () => {
    serve({ pairings: [], question });
    render(<Harness status="PLACED" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByText(question.text)).toBeNull();
    expect(screen.queryByText('While you wait')).toBeNull();
    expect(answer).not.toHaveBeenCalled();
    expect(screen.getByTestId('reply').textContent).toBe('');
  });

  it('records each block as shown once', async () => {
    serve({ pairings: [bunMaska], question });
    render(<Harness status="PLACED" />);
    await screen.findByText(question.text);
    const kinds = recordEvent.mock.calls.map(([e]) => e.kind).sort();
    expect(kinds).toEqual(['pairing_shown', 'question_shown']);
  });
});
