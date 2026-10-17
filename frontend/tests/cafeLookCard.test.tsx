// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { THEMES } from '../src/themes';
import { CafeLookCard } from '../src/organisms/dashboard/CafeLookCard';
import { SUGGESTED_TAGLINES, TAGLINE_MAX } from '../src/organisms/dashboard/CafeLookCard/taglines';

const update = vi.hoisted(() => vi.fn());
vi.mock('../src/services/dashboard/identity', () => ({ default: { update } }));
vi.mock('../src/utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const LAUNCH = ['warm-classic', 'modern-minimal', 'cozy-night'];

const business = (identity: Record<string, unknown> = { enabled: true }) => ({
  name: 'Brew House',
  logoUrl: '',
  coverImageUrl: '',
  identity,
});

const categories = [
  { _id: 'c1', name: 'Coffee' },
  { _id: 'c2', name: 'Bakes' },
  { _id: 'c3', name: 'Sandwiches' },
];
const dish = (id: string, name: string, categoryId: string, over: object = {}) => ({
  _id: id,
  name,
  categoryId,
  pricePaise: 15000,
  isAvailable: true,
  ...over,
});
const products = [
  dish('p1', 'Flat White', 'c1'),
  dish('p2', 'Cold Brew', 'c1'),
  dish('p3', 'Cortado', 'c1'),
  dish('p4', 'Croissant', 'c2', { isHouseSpecial: true }),
  dish('p5', 'Hidden Bun', 'c2', { isAvailable: false }),
  dish('p6', 'Club Sandwich', 'c3'),
];

const renderCard = (b: object = business()) =>
  render(<CafeLookCard business={b} categories={categories} products={products} />);

const savedIdentity = (over: object = {}) => ({
  enabled: true,
  mascotRendering: 'light',
  theme: null,
  tagline: '',
  ...over,
});

beforeEach(() => {
  update.mockReset();
  update.mockResolvedValue(savedIdentity());
});
afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[data-cafe-font]').forEach((el) => el.remove());
});

describe('CafeLookCard', () => {
  it('lists exactly the three launch themes, each with its 3 swatches', () => {
    renderCard();
    const cards = screen.getAllByTestId(/^theme-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual(
      LAUNCH.map((id) => `theme-${id}`),
    );
    for (const id of LAUNCH) {
      const theme = THEMES[id];
      const swatches = within(screen.getByRole('group', { name: `${theme.name} colours` })).getAllByRole(
        'button',
      );
      expect(swatches).toHaveLength(3);
      expect(swatches.map((b) => b.getAttribute('aria-label'))).toEqual(
        theme.variants.map((v) => `${theme.name} ${v.name}`),
      );
      expect(swatches.map((b) => (b as HTMLElement).style.backgroundColor)).not.toContain('');
    }
    expect(screen.queryByTestId('theme-caos')).toBeNull();
  });

  it('saves the theme and variant pair when a variant is chosen', async () => {
    update.mockResolvedValue(
      savedIdentity({ theme: { id: 'warm-classic', variantId: 'olive' } }),
    );
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Warm Classic Olive' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Warm Classic Olive' }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ themeId: 'warm-classic', variantId: 'olive' });
  });

  it("choosing a theme's name picks its first variant", async () => {
    update.mockResolvedValue(
      savedIdentity({ theme: { id: 'cozy-night', variantId: 'amber' } }),
    );
    renderCard();
    fireEvent.click(within(screen.getByTestId('theme-cozy-night')).getByText('Cozy Night'));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({ themeId: 'cozy-night', variantId: 'amber' });
  });

  it('does not save again for the look that is already chosen', async () => {
    renderCard(business({ enabled: true, themeId: 'modern-minimal', variantId: 'ocean' }));
    expect(
      screen.getByRole('button', { name: 'Modern Minimal Ocean' }).getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Modern Minimal Ocean' }));
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps the saved look when a save fails', async () => {
    update.mockRejectedValue(new Error('Café identity is not switched on for your business.'));
    renderCard(business({ enabled: true, themeId: 'warm-classic', variantId: 'terracotta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cozy Night Ember' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Warm Classic Terracotta' }).getAttribute('aria-pressed'),
      ).toBe('true'),
    );
    expect(screen.getByRole('button', { name: 'Cozy Night Ember' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('shows no theme as chosen for a retired or unknown stored theme', () => {
    renderCard(business({ enabled: true, themeId: 'retro-diner', variantId: 'neon' }));
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(screen.queryByText('Go back to the standard look')).toBeNull();
  });

  it('goes back to the standard look by clearing the theme', async () => {
    renderCard(business({ enabled: true, themeId: 'warm-classic', variantId: 'plum' }));
    fireEvent.click(screen.getByText('Go back to the standard look'));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ themeId: null }));
  });

  it('caps the tagline at 80 characters', () => {
    renderCard();
    const input = screen.getByLabelText('Tagline') as HTMLInputElement;
    expect(input.maxLength).toBe(TAGLINE_MAX);
    expect(TAGLINE_MAX).toBe(80);

    fireEvent.change(input, { target: { value: 'x'.repeat(120) } });
    expect(input.value).toHaveLength(80);
    expect(screen.getByText('80/80')).toBeTruthy();
  });

  it('fills the tagline from a suggestion and saves it on request', async () => {
    update.mockResolvedValue(savedIdentity({ tagline: SUGGESTED_TAGLINES[1] }));
    renderCard();
    const input = screen.getByLabelText('Tagline') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: SUGGESTED_TAGLINES[1] }));
    expect(input.value).toBe(SUGGESTED_TAGLINES[1]);
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ tagline: SUGGESTED_TAGLINES[1] }));
  });

  it('every suggested tagline fits the limit', () => {
    for (const t of SUGGESTED_TAGLINES) expect(t.length).toBeLessThanOrEqual(TAGLINE_MAX);
  });

  it("previews the café's name and its first 2 sections with 2 dishes each, in the chosen theme", () => {
    renderCard(business({ enabled: true, themeId: 'cozy-night', variantId: 'ember', tagline: 'Late' }));
    const preview = screen.getByRole('group', { name: 'Menu preview' });
    const scope = preview.querySelector('[data-cafe-theme]') as HTMLElement;
    expect(scope.getAttribute('data-cafe-theme')).toBe('cozy-night');
    expect(scope.style.getPropertyValue('--cafe-page')).toBe(THEMES['cozy-night'].tokens.page);

    const inPreview = within(preview);
    expect(inPreview.getByText('Brew House')).toBeTruthy();
    expect(inPreview.getByText('Late')).toBeTruthy();
    expect(inPreview.getByText('Coffee')).toBeTruthy();
    expect(inPreview.getByText('Bakes')).toBeTruthy();
    expect(inPreview.queryByText('Sandwiches')).toBeNull();
    expect(inPreview.getByText('Flat White')).toBeTruthy();
    expect(inPreview.getByText('Cold Brew')).toBeTruthy();
    expect(inPreview.queryByText('Cortado')).toBeNull();
    // A hidden dish is not shown; the house special is badged.
    expect(inPreview.queryByText('Hidden Bun')).toBeNull();
    expect(inPreview.getByText('Croissant')).toBeTruthy();
    expect(inPreview.getByText('House special')).toBeTruthy();
  });

  it('previews the new theme as soon as one is picked', async () => {
    let finish: (v: unknown) => void = () => {};
    update.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Modern Minimal Sage' }));

    const scope = screen
      .getByRole('group', { name: 'Menu preview' })
      .querySelector('[data-cafe-theme]') as HTMLElement;
    expect(scope.getAttribute('data-cafe-theme')).toBe('modern-minimal');

    finish(savedIdentity({ theme: { id: 'modern-minimal', variantId: 'sage' } }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy());
  });
});
