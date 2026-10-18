// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// The page's neighbours that need a network, sockets or the canvas are stood in for; everything
// that decides what the page shows (its hooks, the tracker layouts) is the real thing.
vi.mock('../src/services/public/orders', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        order: {
          _id: 'o1',
          orderNumber: 'ART-01',
          customerName: 'Asha',
          tableName: 'Table 4',
          orderStatus: 'PLACED',
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
          items: [{ name: 'Latte', quantity: 1, itemTotalPaise: 25000 }],
          subtotalPaise: 25000,
          taxPaise: 0,
          totalAmountPaise: 25000,
          createdAt: '2026-10-18T10:30:00.000Z',
        },
        business: { name: 'Brew House', slug: 'brew-house' },
      },
    }),
    recover: vi.fn().mockResolvedValue({ data: [] }),
  },
}));
vi.mock('../src/services/socket', () => ({
  getSocket: () => ({ on: () => {}, off: () => {} }),
  joinOrderRoom: () => {},
  onReconnect: () => () => {},
}));
vi.mock('../src/mascot/PageMascot', () => ({ PageMascot: () => null }));

import { CustomerOrderTrackingPage } from '../src/pages/CustomerOrderTrackingPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stubScreen = (mobile: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: mobile,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/c/brew-house/order/o1']}>
      <Routes>
        <Route path="/c/:slug/order/:orderId" element={<CustomerOrderTrackingPage />} />
      </Routes>
    </MemoryRouter>,
  );

// A page that throws while it goes from "loading" to "loaded" leaves a blank screen, so these
// check that the order actually appears.
describe('CustomerOrderTrackingPage', () => {
  it('shows the order on a phone, with tabs', async () => {
    stubScreen(true);
    renderPage();
    expect(await screen.findByText('Your Order Progress')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Bill' })).toBeTruthy();
    expect(screen.queryByText('Your Bill')).toBeNull();
  });

  it('shows the whole order on one page on a larger screen', async () => {
    stubScreen(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('Your Order Progress')).toBeTruthy());
    expect(screen.getByText('Your Bill')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
  });
});
