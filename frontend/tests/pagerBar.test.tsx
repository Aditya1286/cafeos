// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PagerBar } from '../src/molecules/MobileList';

const scrollTo = vi.fn();
beforeEach(() => vi.stubGlobal('scrollTo', scrollTo));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollTo.mockClear();
});

describe('PagerBar', () => {
  it('stays at the bottom of the screen while the list scrolls', () => {
    const { container } = render(<PagerBar page={2} totalPages={5} onPageChange={() => {}} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toContain('sticky');
    expect(bar.className).toContain('bottom-0');
  });

  it('goes to the next and previous page, and back to the top of the page', () => {
    const onPageChange = vi.fn();
    render(<PagerBar page={2} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    fireEvent.click(screen.getByRole('button', { name: /Prev/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('stops at the first and last page', () => {
    const { rerender } = render(<PagerBar page={1} totalPages={3} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: /Prev/ }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<PagerBar page={3} totalPages={3} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: /Next/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('is not shown when everything fits on one page', () => {
    const { container } = render(<PagerBar page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container.firstElementChild).toBeNull();
  });
});
