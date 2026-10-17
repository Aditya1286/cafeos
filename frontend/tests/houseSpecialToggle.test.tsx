// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DigitalMenuPanel } from '../src/organisms/dashboard/DigitalMenuPanel';

const categories = [{ _id: 'c1', name: 'Coffee' }];
const products = [
  { _id: 'p1', name: 'Flat White', categoryId: 'c1', pricePaise: 15000, isAvailable: true },
  {
    _id: 'p2',
    name: 'Cold Brew',
    categoryId: 'c1',
    pricePaise: 18000,
    isAvailable: true,
    isHouseSpecial: true,
  },
];

const renderPanel = (props: object = {}) =>
  render(
    <DigitalMenuPanel
      products={products}
      categories={categories}
      onAddItem={vi.fn()}
      onUploadMenu={vi.fn()}
      onEditItem={vi.fn()}
      onRemoveItem={vi.fn()}
      onRestoreItem={vi.fn()}
      onDeleteItem={vi.fn()}
      {...props}
    />,
  );

afterEach(cleanup);

describe('DigitalMenuPanel house special toggle', () => {
  it('has no toggle while café identity is off', () => {
    renderPanel({ onToggleHouseSpecial: vi.fn() });
    expect(screen.queryByLabelText(/House special:/)).toBeNull();
    expect(screen.queryByText(/house specials/)).toBeNull();
  });

  it('shows a toggle per dish with its state, and the count out of 3, while identity is on', () => {
    renderPanel({ houseSpecialsEnabled: true, onToggleHouseSpecial: vi.fn() });
    expect(screen.getByLabelText('House special: Flat White').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByLabelText('House special: Cold Brew').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByText(/1 of 3 house specials/)).toBeTruthy();
  });

  it('asks to mark an unmarked dish and to unmark a marked one', () => {
    const onToggle = vi.fn();
    renderPanel({ houseSpecialsEnabled: true, onToggleHouseSpecial: onToggle });
    fireEvent.click(screen.getByLabelText('House special: Flat White'));
    expect(onToggle).toHaveBeenLastCalledWith('p1', true);
    fireEvent.click(screen.getByLabelText('House special: Cold Brew'));
    expect(onToggle).toHaveBeenLastCalledWith('p2', false);
  });
});
