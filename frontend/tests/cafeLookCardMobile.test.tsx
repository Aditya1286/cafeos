// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { THEMES } from '../src/themes';
import { CafeLookCardMobile } from '../src/organisms/dashboard/CafeLookCard';
import { SnapSlider } from '../src/molecules/SnapSlider';
import { SUGGESTED_TAGLINES } from '../src/organisms/dashboard/CafeLookCard/taglines';

const update = vi.hoisted(() => vi.fn());
vi.mock('../src/services/dashboard/identity', () => ({ default: { update } }));
vi.mock('../src/utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const saved = (over: object = {}) => ({
  enabled: true,
  mascotRendering: 'light',
  theme: null,
  tagline: '',
  ...over,
});

const renderCard = () =>
  render(
    <CafeLookCardMobile
      business={{ name: 'Brew House', identity: { enabled: true } }}
      categories={[{ _id: 'c1', name: 'Coffee' }]}
      products={[{ _id: 'p1', name: 'Flat White', categoryId: 'c1', pricePaise: 15000 }]}
    />,
  );

beforeEach(() => {
  update.mockReset();
  update.mockResolvedValue(saved());
});
afterEach(cleanup);

describe('CafeLookCardMobile', () => {
  it('slides the three launch themes, each with its swatches', () => {
    renderCard();
    expect(screen.getByRole('group', { name: 'Themes' })).toBeTruthy();
    expect(screen.getAllByTestId(/^theme-/)).toHaveLength(3);
    const theme = THEMES['warm-classic'];
    expect(
      within(screen.getByRole('group', { name: `${theme.name} colours` })).getAllByRole('button'),
    ).toHaveLength(theme.variants.length);
  });

  it('saves a chosen colour, like the desktop card', async () => {
    update.mockResolvedValue(saved({ theme: { id: 'warm-classic', variantId: 'olive' } }));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Warm Classic Olive' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({ themeId: 'warm-classic', variantId: 'olive' });
  });

  it('puts a tapped suggested tagline in the field, and saves it on Save', async () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: SUGGESTED_TAGLINES[0] }));
    expect((screen.getByLabelText('Tagline') as HTMLInputElement).value).toBe(SUGGESTED_TAGLINES[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ tagline: SUGGESTED_TAGLINES[0] }));
  });

  it('keeps a small live preview pinned above the choices, besides the full one below', () => {
    renderCard();
    const mini = screen.getByTestId('preview-mini');
    expect(mini.className).toContain('sticky');
    expect(within(mini).getByRole('group', { name: 'Menu preview' })).toBeTruthy();
    expect(screen.getAllByRole('group', { name: 'Menu preview' })).toHaveLength(2);
  });
});

describe('SnapSlider', () => {
  it("keeps a touch on the slider from reaching the swipeable tabs around it", () => {
    const outer = vi.fn();
    const { container } = render(
      <div ref={(el) => el?.addEventListener('pointerdown', outer)}>
        <SnapSlider ariaLabel="Row">{[<span key="a">A</span>, <span key="b">B</span>]}</SnapSlider>
        <span>outside</span>
      </div>,
    );
    fireEvent.pointerDown(screen.getByText('A'));
    expect(outer).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(outer).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[aria-hidden="true"] span')).toHaveLength(2); // the dots
  });
});
