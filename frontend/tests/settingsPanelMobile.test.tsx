// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsPanel } from '../src/organisms/dashboard/SettingsPanel';
import { SettingsPanelMobile } from '../src/organisms/dashboard/SettingsPanel/SettingsPanelMobile';
import { MOBILE_SECTIONS } from '../src/organisms/dashboard/SettingsPanel/mobileSections';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const makeProps = (over: object = {}) =>
  ({
    business: {
      name: 'Brew House',
      slug: 'brew-house',
      address: '12 MG Road',
      phone: '+91 98765 01234',
      taxRatePercentage: 5,
      gstin: '',
      upiVpa: 'brew@okhdfc',
    },
    subscription: {
      planName: 'basic',
      usage: { tables: 3, menuItems: 12 },
      limits: { maxTables: 10, maxMenuItems: 50 },
    },
    upiVpaInput: 'brew@okhdfc',
    setUpiVpaInput: vi.fn(),
    savingUpiVpa: false,
    onSaveUpiVpa: vi.fn(),
    savingGstin: false,
    onSaveGstin: vi.fn().mockResolvedValue(true),
    savingTaxRate: false,
    onSaveTaxRate: vi.fn(),
    publicMenuUrl: 'https://caos.test/c/brew-house',
    copiedUrl: false,
    onCopyMenuUrl: vi.fn(),
    subscriptionStatus: null,
    subscriptionPlans: [],
    loadingSubscription: false,
    requestingPlanId: null,
    markingUpgradePaid: false,
    cancellingUpgrade: false,
    onRequestUpgrade: vi.fn(),
    onMarkUpgradePaid: vi.fn(),
    onCancelUpgrade: vi.fn(),
    checkout: {},
    categories: [],
    products: [],
    ...over,
  }) as any;

const openTab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

describe('SettingsPanelMobile', () => {
  it('opens on the business tab, and only shows that tab', () => {
    render(<SettingsPanelMobile {...makeProps()} />);
    expect(screen.getByText('Brew House')).toBeTruthy();
    expect(screen.getByText('12 MG Road')).toBeTruthy();
    expect(screen.queryByText(/GST \/ Tax on Orders/)).toBeNull();
    expect(screen.queryByText('Your Menu QR Code')).toBeNull();
  });

  it('has a tab per group of settings, and Café look only when it is on', () => {
    const { unmount } = render(<SettingsPanelMobile {...makeProps()} />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Business',
      'Tax & pay',
      'Menu QR',
      'Plan',
    ]);
    unmount();
    render(
      <SettingsPanelMobile
        {...makeProps({ business: { ...makeProps().business, identity: { enabled: true } } })}
      />,
    );
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toContain('Café look');
  });

  it('copies the menu link from the business tab', () => {
    const props = makeProps();
    render(<SettingsPanelMobile {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy Menu URL/ }));
    expect(props.onCopyMenuUrl).toHaveBeenCalled();
  });

  it('keeps tax, GSTIN and the UPI ID together, and saves them as before', () => {
    const props = makeProps();
    render(<SettingsPanelMobile {...props} />);
    openTab('Tax & pay');
    expect(screen.getByText(/GST \/ Tax on Orders/)).toBeTruthy();
    expect(screen.getByText(/UPI ID/)).toBeTruthy();

    fireEvent.click(screen.getByTitle('GST enabled — click to disable'));
    expect(props.onSaveTaxRate).toHaveBeenCalledWith(0);

    fireEvent.change(screen.getByPlaceholderText('yourbusiness@okhdfcbank'), {
      target: { value: 'new@upi' },
    });
    expect(props.setUpiVpaInput).toHaveBeenCalledWith('new@upi');
  });

  it('only lets the UPI ID be saved once it has changed', () => {
    const { unmount } = render(<SettingsPanelMobile {...makeProps()} />);
    openTab('Tax & pay');
    const unchanged = screen.getAllByRole('button', { name: 'Save' }).at(-1) as HTMLButtonElement;
    expect(unchanged.disabled).toBe(true);
    unmount();

    const props = makeProps({ upiVpaInput: 'new@upi' });
    render(<SettingsPanelMobile {...props} />);
    openTab('Tax & pay');
    const changed = screen.getAllByRole('button', { name: 'Save' }).at(-1) as HTMLButtonElement;
    expect(changed.disabled).toBe(false);
    fireEvent.click(changed);
    expect(props.onSaveUpiVpa).toHaveBeenCalled();
  });

  it('shows the menu QR code and link on their own tab', () => {
    const props = makeProps();
    render(<SettingsPanelMobile {...props} />);
    openTab('Menu QR');
    expect(screen.getByText('Your Menu QR Code')).toBeTruthy();
    expect(screen.getByRole('link', { name: /See What Customers See/ }).getAttribute('href')).toBe(
      'https://caos.test/c/brew-house',
    );
    fireEvent.click(screen.getByRole('button', { name: /Copy Menu Link/ }));
    expect(props.onCopyMenuUrl).toHaveBeenCalled();
  });

  it('shows the plan and what is used of it on the plan tab', () => {
    render(<SettingsPanelMobile {...makeProps()} />);
    openTab('Plan');
    expect(screen.getByText('BASIC PLAN')).toBeTruthy();
    expect(screen.getByText('3 / 10')).toBeTruthy();
    expect(screen.getByText('12 / 50')).toBeTruthy();
  });
});

describe('the list of Settings tabs', () => {
  it('gives every tab its own id and a short label', () => {
    const ids = MOBILE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of MOBILE_SECTIONS) expect(section.label.length).toBeLessThanOrEqual(12);
  });

  it('shows the tabs in the order of the list, leaving out the ones that are not visible', () => {
    render(<SettingsPanelMobile {...makeProps()} />);
    const shown = MOBILE_SECTIONS.filter((s) => s.isVisible?.(makeProps()) ?? true).map(
      (s) => s.label,
    );
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(shown);
  });

  it('scrolls the tab bar sideways once there are more than four tabs', () => {
    const withLook = makeProps({
      business: { ...makeProps().business, identity: { enabled: true } },
    });
    const { container } = render(<SettingsPanelMobile {...withLook} />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(container.querySelector('[role="tablist"] > div')!.className).toContain(
      'overflow-x-auto',
    );
  });
});

describe('the Settings tab chooses one layout by screen size', () => {
  const stubScreen = (mobile: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: mobile,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));

  it('gives phones the tabs', () => {
    stubScreen(true);
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.getByRole('tablist')).toBeTruthy();
  });

  it('gives everything else the whole page', () => {
    stubScreen(false);
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText(/GST \/ Tax on Orders/)).toBeTruthy();
    expect(screen.getByText('Your Menu QR Code')).toBeTruthy();
  });
});
