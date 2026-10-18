// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SwipeTabs } from '../src/molecules/SwipeTabs';

const TABS = [
  { id: 'status', label: 'Status' },
  { id: 'bill', label: 'Bill' },
  { id: 'orders', label: 'My orders', badge: 2 },
];

afterEach(cleanup);

describe('SwipeTabs', () => {
  it('shows the active tab selected, with its content below the tab bar', () => {
    render(
      <SwipeTabs tabs={TABS} active="bill" onChange={() => {}}>
        <p>the bill</p>
      </SwipeTabs>,
    );
    expect(screen.getByRole('tab', { name: 'Bill' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Status' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByText('the bill')).toBeTruthy();
  });

  it('asks for the tab that was tapped', () => {
    const onChange = vi.fn();
    render(
      <SwipeTabs tabs={TABS} active="status" onChange={onChange}>
        <p>status</p>
      </SwipeTabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /My orders/ }));
    expect(onChange).toHaveBeenCalledWith('orders');
  });

  it('shows a count on a tab, and none when it is zero', () => {
    render(
      <SwipeTabs
        tabs={[...TABS, { id: 'wait', label: 'Wait', badge: 0 }]}
        active="status"
        onChange={() => {}}
      >
        <p>status</p>
      </SwipeTabs>,
    );
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('does not re-select the tab that is already open', () => {
    const onChange = vi.fn();
    render(
      <SwipeTabs tabs={TABS} active="status" onChange={onChange}>
        <p>status</p>
      </SwipeTabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('with many tabs', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, label: `Setting ${i + 1}` }));
    const bar = (container: HTMLElement) =>
      container.querySelector('[role="tablist"] > div') as HTMLElement;

    it('shares the width equally up to four tabs, and scrolls sideways beyond that', () => {
      const four = render(
        <SwipeTabs tabs={many.slice(0, 4)} active="t0" onChange={() => {}}>
          <p>x</p>
        </SwipeTabs>,
      );
      expect(bar(four.container).className).toContain('grid');
      four.unmount();

      const ten = render(
        <SwipeTabs tabs={many} active="t0" onChange={() => {}}>
          <p>x</p>
        </SwipeTabs>,
      );
      expect(bar(ten.container).className).toContain('overflow-x-auto');
      expect(bar(ten.container).className).not.toContain('grid');
      expect(screen.getAllByRole('tab')).toHaveLength(10);
    });

    it('keeps the open tab in view, and still reaches the last one', () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const onChange = vi.fn();
      const { rerender } = render(
        <SwipeTabs tabs={many} active="t0" onChange={onChange}>
          <p>x</p>
        </SwipeTabs>,
      );
      fireEvent.click(screen.getByRole('tab', { name: 'Setting 10' }));
      expect(onChange).toHaveBeenCalledWith('t9');

      scrollIntoView.mockClear();
      rerender(
        <SwipeTabs tabs={many} active="t9" onChange={onChange}>
          <p>x</p>
        </SwipeTabs>,
      );
      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ inline: 'center' }));
    });
  });
});
