// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BusinessManagementModal } from '../src/organisms/super-admin/BusinessManagementModal';

const business = { id: 'b1', name: 'Brew House', status: 'ACTIVE' };

const renderModal = (identity: object | undefined, onSetIdentity = vi.fn().mockResolvedValue(true)) => {
  render(
    <BusinessManagementModal
      business={business}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      identity={identity as any}
      onSetIdentity={onSetIdentity}
    />,
  );
  return onSetIdentity;
};

afterEach(cleanup);

describe('BusinessManagementModal café identity section', () => {
  it('switches identity on for the café', () => {
    const onSet = renderModal({ enabled: false });
    const toggle = screen.getByRole('switch', { name: 'Café identity' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(onSet).toHaveBeenCalledWith('b1', { enabled: true });
  });

  it('switches identity off for a café that is on', () => {
    const onSet = renderModal({ enabled: true, themeId: 'warm-classic', variantId: 'olive' });
    const toggle = screen.getByRole('switch', { name: 'Café identity' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(onSet).toHaveBeenCalledWith('b1', { enabled: false });
  });

  it('offers the three launch themes and sets a theme with its first colour', () => {
    const onSet = renderModal(undefined);
    const theme = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(within(theme).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Standard look',
      'Warm Classic',
      'Modern Minimal',
      'Cozy Night',
    ]);
    const save = screen.getByRole('button', { name: 'Save theme' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(theme, { target: { value: 'cozy-night' } });
    const colour = screen.getByLabelText('Colour') as HTMLSelectElement;
    expect(within(colour).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Amber',
      'Ember',
      'Mint',
    ]);
    fireEvent.change(colour, { target: { value: 'mint' } });
    fireEvent.click(save);
    expect(onSet).toHaveBeenCalledWith('b1', { themeId: 'cozy-night', variantId: 'mint' });
  });

  it('clears the theme when the standard look is chosen', () => {
    const onSet = renderModal({ enabled: true, themeId: 'modern-minimal', variantId: 'ocean' });
    expect((screen.getByLabelText('Theme') as HTMLSelectElement).value).toBe('modern-minimal');
    expect((screen.getByLabelText('Colour') as HTMLSelectElement).value).toBe('ocean');
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save theme' }));
    expect(onSet).toHaveBeenCalledWith('b1', { themeId: null });
  });
});
