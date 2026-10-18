// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MenuSection } from '../src/organisms/customer-menu/MenuSection';

afterEach(cleanup);

const section = (mascot?: { room: boolean; tipPeekId?: string }) =>
  render(
    <MenuSection
      title="Hot Coffee"
      count={4}
      collapsed={false}
      onToggle={() => {}}
      categoryId="hot"
      mascot={mascot}
    >
      <p>items</p>
    </MenuSection>,
  );

describe('a menu category and the mascot', () => {
  it('is exactly as before when the café has no mascot', () => {
    const { container } = section(undefined);
    const bar = screen.getByRole('button', { name: /Hot Coffee/ });
    expect(bar.hasAttribute('data-mascot-peek')).toBe(false);
    expect(bar.className).not.toContain('z-10');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('leaves room above its top bar for the mascot to rise into', () => {
    const { container } = section({ room: true });
    const room = container.querySelector('section > [aria-hidden="true"]') as HTMLElement;
    expect(room).toBeTruthy();
    expect(room.className).toContain('h-4');
    // The room comes before the top bar, so it sits above it.
    expect(room.nextElementSibling).toBe(screen.getByRole('button', { name: /Hot Coffee/ }));
  });

  it('marks the top bar as the card the mascot rises from: opaque and above the mascot layer', () => {
    section({ room: true, tipPeekId: 'tip:hot' });
    const bar = screen.getByRole('button', { name: /Hot Coffee/ });
    expect(bar.getAttribute('data-mascot-peek')).toBe('tip:hot');
    expect(bar.className).toContain('relative');
    expect(bar.className).toContain('z-10');
    expect(bar.className).toContain('bg-cafe-page');
  });

  it('has room but no pop-up when the category has no tip', () => {
    const { container } = section({ room: true });
    const bar = screen.getByRole('button', { name: /Hot Coffee/ });
    expect(container.querySelector('section > [aria-hidden="true"]')).toBeTruthy();
    expect(bar.hasAttribute('data-mascot-peek')).toBe(false);
    expect(bar.className).not.toContain('z-10');
  });

  it('still opens and closes, and shows its items', () => {
    section({ room: true, tipPeekId: 'tip:hot' });
    expect(screen.getByText('items')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hot Coffee/ }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });
});
