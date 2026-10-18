// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OrderReviewCard } from '../src/organisms/customer-order/OrderReviewCard';
import type { OrderReviewHook } from '../src/hooks/useOrderReview';

vi.mock('../src/utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const TAGS = [
  { id: 'great-taste', label: 'Great taste', theme: 'food', ratings: [4, 5] },
  { id: 'quick-service', label: 'Quick service', theme: 'speed', ratings: [4, 5] },
  { id: 'long-wait', label: 'Too long a wait', theme: 'speed', ratings: [1, 2] },
] as const;

const hook = (over: Partial<OrderReviewHook> = {}, state: object | null = {}): OrderReviewHook => ({
  state: state && { eligible: true, review: null, tags: [...TAGS], ...state },
  submitting: false,
  submit: vi.fn().mockResolvedValue(undefined),
  ...over,
});

describe('OrderReviewCard', () => {
  it('shows nothing until the order can be reviewed', () => {
    const { container, rerender } = render(<OrderReviewCard review={hook({}, null)} />);
    expect(container.firstChild).toBeNull();
    rerender(<OrderReviewCard review={hook({}, { eligible: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('asks for stars first, and offers reasons only once there is a rating', () => {
    render(<OrderReviewCard review={hook()} />);
    expect(screen.getByText('How was your order?')).toBeTruthy();
    expect(screen.queryByText('Great taste')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    expect(screen.getByText('Loved it!')).toBeTruthy();
    expect(screen.getByText('What did you like?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Great taste' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Too long a wait' })).toBeNull();
  });

  it('offers what went wrong for low stars, and drops a reason that no longer fits', () => {
    render(<OrderReviewCard review={hook()} />);
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Great taste' }));
    fireEvent.click(screen.getByRole('radio', { name: '1 star' }));
    expect(screen.getByText('What went wrong?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Too long a wait' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    expect(screen.getByRole('button', { name: 'Great taste' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('sends the stars, the ticked reasons and the comment', () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<OrderReviewCard review={hook({ submit })} />);
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Great taste' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quick service' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quick service' })); // untick
    fireEvent.change(screen.getByLabelText('Anything else? (optional)'), {
      target: { value: '  Nice cortado ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(submit).toHaveBeenCalledWith(4, ['great-taste'], 'Nice cortado');
  });

  it('shows what was left, with no form, after a review', () => {
    render(
      <OrderReviewCard
        review={hook(
          {},
          {
            eligible: false,
            review: { rating: 4, tags: ['great-taste'], comment: 'Lovely', createdAt: '' },
          },
        )}
      />,
    );
    expect(screen.getByText('Thanks for your feedback!')).toBeTruthy();
    expect(screen.getByText('Great taste')).toBeTruthy();
    expect(screen.getByText('“Lovely”')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull();
  });
});
