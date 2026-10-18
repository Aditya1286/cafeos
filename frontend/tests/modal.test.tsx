// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '../src/molecules/Modal';

afterEach(cleanup);

describe('Modal', () => {
  it('shows its title and content', () => {
    render(
      <Modal title="Add menu item" onClose={() => {}}>
        <p>the form</p>
      </Modal>,
    );
    expect(screen.getByText('Add menu item')).toBeTruthy();
    expect(screen.getByText('the form')).toBeTruthy();
  });

  it('is never taller than the screen: the card is capped and only its content scrolls', () => {
    render(
      <Modal title="Add menu item" onClose={() => {}}>
        <p>the form</p>
      </Modal>,
    );
    const card = screen.getByText('Add menu item').closest('[class*="rounded-3xl"]') as HTMLElement;
    expect(card.className).toContain('max-h-full');
    expect(card.className).toContain('flex-col');
    const scroller = screen.getByText('the form').parentElement!;
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.className).toContain('min-h-0');
  });

  it('keeps the title and the close button outside the scrolling part, so they stay in view', () => {
    render(
      <Modal title="Add menu item" onClose={() => {}}>
        <p>the form</p>
      </Modal>,
    );
    const scroller = screen.getByText('the form').parentElement!;
    expect(scroller.contains(screen.getByText('Add menu item'))).toBe(false);
    expect(scroller.contains(screen.getByRole('button'))).toBe(false);
  });

  it('no longer centres a growing card, which pushed its top off the screen', () => {
    const { container } = render(
      <Modal title="Add menu item" onClose={() => {}}>
        <p>the form</p>
      </Modal>,
    );
    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay.className).not.toContain('overflow-y-auto');
    const card = screen.getByText('Add menu item').closest('[class*="rounded-3xl"]') as HTMLElement;
    expect(card.className).not.toContain('my-8');
  });

  it('spaces several children apart, as before', () => {
    render(
      <Modal title="Staff" onClose={() => {}}>
        <p>one</p>
        <p>two</p>
      </Modal>,
    );
    expect(screen.getByText('one').parentElement!.className).toContain('space-y-5');
  });

  it('closes from the X and from the backdrop, but not from a click inside the card', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Staff" onClose={onClose}>
        <p>inside</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(container.firstElementChild!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('takes a wider card for big content', () => {
    render(
      <Modal title="Bill" onClose={() => {}} maxWidth="max-w-3xl">
        <p>items</p>
      </Modal>,
    );
    expect(
      (screen.getByText('Bill').closest('[class*="rounded-3xl"]') as HTMLElement).className,
    ).toContain('max-w-3xl');
  });
});
