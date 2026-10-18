// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Flame, DollarSign } from 'lucide-react';
import { KpiStatsGridMobile } from '../src/organisms/dashboard/KpiStatsGrid/KpiStatsGridMobile';

afterEach(cleanup);

const cards = [
  {
    icon: Flame,
    label: 'Orders in Kitchen',
    value: 3,
    subtext: 'Being prepared now',
    trend: '3 of 9 today',
    color: 'text-slate-900',
    iconBg: 'bg-brand-500',
    border: 'border-slate-200',
  },
  {
    icon: DollarSign,
    label: "Today's Sales",
    value: '₹1,234',
    subtext: '9 orders today',
    trend: '+5% vs last week',
    color: 'text-slate-900',
    iconBg: 'bg-brand-500',
    border: 'border-slate-200',
  },
];

describe('the Overview on a phone', () => {
  it('starts closed: the numbers are hidden until it is tapped', () => {
    render(<KpiStatsGridMobile cards={cards} />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Show/ })).toBeTruthy();
    expect(screen.queryByText('Orders in Kitchen')).toBeNull();
    expect(screen.queryByText("Today's Sales")).toBeNull();
  });

  it('opens when tapped, and closes again', async () => {
    render(<KpiStatsGridMobile cards={cards} />);
    fireEvent.click(screen.getByRole('button', { name: /Show/ }));
    expect(screen.getByText('Orders in Kitchen')).toBeTruthy();
    expect(screen.getByText('₹1,234')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Hide/ }));
    await waitFor(() => expect(screen.queryByText('Orders in Kitchen')).toBeNull());
  });
});
