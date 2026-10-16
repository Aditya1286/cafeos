// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { MascotReaction } from '../src/mascot/types';

// The experience with stub renderers: no WebGL, no SVG. What is under test is the shell's wiring
// (brain → bubble, actions, dressing, renderer choice and fallback), not the drawing.
const engines = vi.hoisted(() => {
  const state = {
    heavy: 0,
    lite: 0,
    failHeavy: false,
    bands: [] as string[],
  };
  const stub = () => ({
    setExpression: () => {},
    triggerGesture: () => {},
    setLook: () => {},
    setFlowVelocity: () => {},
    setReducedMotion: () => {},
    resize: () => {},
    setVisible: () => {},
    setAmbientSpin: () => {},
    startEntrance: () => {},
    setBandColor: (hex: string) => {
      state.bands.push(hex);
    },
    dispose: () => {},
  });
  return { state, stub };
});

vi.mock('../src/mascot/engine/createEngine', () => ({
  createMascotEngine: () => {
    engines.state.heavy += 1;
    if (engines.state.failHeavy) throw new Error('WebGL unavailable');
    return engines.stub();
  },
}));
vi.mock('../src/mascot/lite/createLiteEngine', () => ({
  createLiteEngine: () => {
    engines.state.lite += 1;
    return engines.stub();
  },
}));

import MascotExperience from '../src/mascot/MascotExperience';

beforeAll(() => {
  // jsdom has no matchMedia: a desktop-sized viewport with motion allowed.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  window.localStorage.clear();
  engines.state.heavy = 0;
  engines.state.lite = 0;
  engines.state.failHeavy = false;
  engines.state.bands = [];
});
afterEach(() => cleanup());

const welcome: Record<string, MascotReaction> = {
  welcome: {
    expression: 'excited',
    message: {
      id: 'welcome',
      text: 'Welcome back, Asha! Kadak masala chai again?',
      durationMs: 60_000,
      actions: [{ id: 'add-usual', label: 'Add' }],
    },
  },
  tip: {
    expression: 'curious',
    message: {
      id: 'tip',
      text: 'Snacks? The fries are the most ordered here.',
      durationMs: 60_000,
    },
  },
  many: {
    message: {
      id: 'many',
      text: 'Pick one',
      durationMs: 60_000,
      actions: [
        { id: 'a', label: 'First' },
        { id: 'b', label: 'Second' },
        { id: 'c', label: 'Third' },
      ],
    },
  },
};

const actionButtons = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('.caos-mascot__action'));

// The shell waits TIMING.entranceDelayMs (900 ms) before it reveals and wires the brain.
const SHOWN = { timeout: 3_000 };

describe('mascot bubble actions', () => {
  it('renders an action button for a message with actions, and reports the clicked id', async () => {
    const onAction = vi.fn();
    const { container } = render(
      <MascotExperience
        page="menu"
        rendering="light"
        reactions={welcome}
        signal="welcome"
        onAction={onAction}
      />,
    );
    await screen.findByText('Welcome back, Asha! Kadak masala chai again?', {}, SHOWN);
    const add = screen.getByRole('button', { name: 'Add' });
    expect(actionButtons(container)).toHaveLength(1);
    fireEvent.click(add);
    expect(onAction).toHaveBeenCalledWith('add-usual');
    expect(onAction).toHaveBeenCalledTimes(1);
    // Acting on the bubble closes it.
    await waitFor(() =>
      expect(container.querySelector('.caos-mascot__bubble')?.getAttribute('data-open')).toBe(
        'false',
      ),
    );
  });

  it('renders no action button for a message without actions', async () => {
    const { container } = render(
      <MascotExperience page="menu" rendering="light" reactions={welcome} signal="tip" />,
    );
    await screen.findByText('Snacks? The fries are the most ordered here.', {}, SHOWN);
    expect(actionButtons(container)).toHaveLength(0);
    // The hide button is still the only other control.
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Hide the CAOS mascot',
    ]);
  });

  it('shows at most two actions', async () => {
    const { container } = render(
      <MascotExperience page="menu" rendering="light" reactions={welcome} signal="many" />,
    );
    await screen.findByText('Pick one', {}, SHOWN);
    expect(actionButtons(container).map((b) => b.textContent)).toEqual(['First', 'Second']);
  });

  it('moves keyboard focus to the hide button after an action closes the bubble', async () => {
    const onAction = vi.fn();
    render(
      <MascotExperience
        page="menu"
        rendering="light"
        reactions={welcome}
        signal="welcome"
        onAction={onAction}
      />,
    );
    const add = await screen.findByRole('button', { name: 'Add' }, SHOWN);
    add.focus();
    expect(document.activeElement).toBe(add);
    fireEvent.click(add);
    expect(onAction).toHaveBeenCalledWith('add-usual');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Hide the CAOS mascot' }),
    );
  });

  it('leaves focus alone when the page moved it during onAction', async () => {
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    render(
      <MascotExperience
        page="menu"
        rendering="light"
        reactions={welcome}
        signal="welcome"
        onAction={() => elsewhere.focus()}
      />,
    );
    const add = await screen.findByRole('button', { name: 'Add' }, SHOWN);
    add.focus();
    fireEvent.click(add);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it('drops the action when the signal moves to a message without one', async () => {
    const { container, rerender } = render(
      <MascotExperience page="menu" rendering="light" reactions={welcome} signal="welcome" />,
    );
    await screen.findByRole('button', { name: 'Add' }, SHOWN);
    rerender(<MascotExperience page="menu" rendering="light" reactions={welcome} signal="tip" />);
    await screen.findByText('Snacks? The fries are the most ordered here.');
    expect(actionButtons(container)).toHaveLength(0);
  });
});

describe('mascot renderer choice and dressing', () => {
  const dress = {
    band: '#7a8b3c',
    bubbleBg: '#fff8ee',
    bubbleFg: '#2b1d14',
    bubbleBorder: '#e2d3bd',
  };

  it('light rendering loads only the light renderer, dressed with the theme', async () => {
    const { container } = render(
      <MascotExperience
        page="menu"
        rendering="light"
        reactions={welcome}
        signal="tip"
        dress={dress}
      />,
    );
    await screen.findByText('Snacks? The fries are the most ordered here.', {}, SHOWN);
    expect(engines.state.lite).toBe(1);
    expect(engines.state.heavy).toBe(0);
    expect(engines.state.bands).toContain('#7a8b3c');
    const host = container.querySelector<HTMLElement>('.caos-mascot')!;
    expect(host.style.getPropertyValue('--m-bubble-bg')).toBe('#fff8ee');
    expect(host.style.getPropertyValue('--m-bubble-fg')).toBe('#2b1d14');
    expect(host.style.getPropertyValue('--m-bubble-border')).toBe('#e2d3bd');
  });

  it('heavy rendering uses the 3D engine', async () => {
    render(<MascotExperience page="menu" rendering="heavy" reactions={welcome} signal="tip" />);
    await screen.findByText('Snacks? The fries are the most ordered here.', {}, SHOWN);
    expect(engines.state.heavy).toBe(1);
    expect(engines.state.lite).toBe(0);
  });

  it('a heavy failure falls back to the light renderer, not the logo poster', async () => {
    engines.state.failHeavy = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <MascotExperience page="menu" reactions={welcome} signal="tip" dress={dress} />,
    );
    await screen.findByText('Snacks? The fries are the most ordered here.', {}, SHOWN);
    expect(engines.state.heavy).toBe(1);
    expect(engines.state.lite).toBe(1);
    expect(engines.state.bands).toContain('#7a8b3c');
    expect(container.querySelector('.caos-mascot__poster')).toBeNull();
    warn.mockRestore();
  });
});
