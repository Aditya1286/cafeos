// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScrollToTop } from '../src/hoc/ScrollToTop';

const scrollTo = vi.fn();
const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.stubGlobal('scrollTo', scrollTo);
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollTo.mockClear();
  scrollIntoView.mockClear();
});

const App = ({ start = '/' }: { start?: string }) => (
  <MemoryRouter initialEntries={[start]}>
    <ScrollToTop />
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Link to="/request-demo">Start your 2-week trial</Link>
            <Link to="/#features">Features</Link>
            <Link to="/?q=latte">Search</Link>
            <section id="features">Features</section>
          </>
        }
      />
      <Route path="/request-demo" element={<p>Request a demo</p>} />
    </Routes>
  </MemoryRouter>
);

describe('ScrollToTop', () => {
  it('opens a new page at the top', () => {
    render(<App />);
    scrollTo.mockClear();
    fireEvent.click(screen.getByText('Start your 2-week trial'));
    expect(screen.getByText('Request a demo')).toBeTruthy();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to the section a link points at, instead of the top', () => {
    render(<App />);
    scrollTo.mockClear();
    scrollIntoView.mockClear();
    fireEvent.click(screen.getByText('Features', { selector: 'a' }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves the scroll alone when only the search changes', () => {
    render(<App />);
    scrollTo.mockClear();
    fireEvent.click(screen.getByText('Search'));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
