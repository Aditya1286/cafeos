// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FilterBar } from '../src/organisms/dashboard/AnalyticsScreen/FilterBar';
import { DEFAULT_FILTERS } from '../src/utils/analyticsFilters';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stubScreen = (wide: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));

const renderBar = (onChange = vi.fn()) =>
  render(
    <FilterBar
      filters={DEFAULT_FILTERS}
      onChange={onChange}
      support={{ slices: true, itemFilters: true } as any}
      categories={[{ _id: 'c1', name: 'Coffee' }]}
      onRefresh={() => {}}
      refreshing={false}
    />,
  );

describe('the analytics filters on a phone', () => {
  it('open in a bottom sheet that is never taller than the screen, with its content scrolling', () => {
    stubScreen(false);
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet.className).toContain('max-h-[90dvh]');
    const scroller = within(sheet).getByLabelText('Period').closest('[class*="overflow-y-auto"]');
    expect(scroller).toBeTruthy();
  });

  it('keep the title and the Done button out of the scrolling part, so they are always in view', () => {
    stubScreen(false);
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    const scroller = within(sheet).getByLabelText('Period').closest('[class*="overflow-y-auto"]')!;
    expect(scroller.contains(within(sheet).getByRole('button', { name: 'Done' }))).toBe(false);
    expect(scroller.contains(within(sheet).getByRole('heading', { name: 'Filters' }))).toBe(false);
  });

  it('hold all the controls: period, comparison, detail and the order and item filters', () => {
    stubScreen(false);
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    for (const label of ['Period', 'Compare with', 'Detail']) {
      expect(within(sheet).getByLabelText(label)).toBeTruthy();
    }
    expect(within(sheet).getByText('Order source')).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'Coffee' })).toBeTruthy();
  });

  it('apply a change straight away, and close from Done or from outside', () => {
    stubScreen(false);
    const onChange = vi.fn();
    renderBar(onChange);
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('Compare with'), { target: { value: 'same_period_last_week' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ compare: 'same_period_last_week' }));

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the analytics filters on a wide screen', () => {
  it('stay a small panel under the Filters button, with the period controls always on the bar', () => {
    stubScreen(true);
    renderBar();
    expect(screen.getByLabelText('Period')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const panel = screen.getByRole('dialog', { name: 'Filters' });
    expect(panel.className).toContain('absolute');
    expect(within(panel).queryByRole('button', { name: 'Done' })).toBeNull();
  });
});
