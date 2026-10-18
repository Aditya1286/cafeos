// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LogoTile } from '../src/molecules/LogoTile';
import { HeaderBrand } from '../src/organisms/dashboard/DashboardHeader/HeaderParts';
import { BusinessHeader } from '../src/organisms/dashboard/SettingsPanel/sections';
import { SettingsPanelMobile } from '../src/organisms/dashboard/SettingsPanel/SettingsPanelMobile';

afterEach(cleanup);

const tile = (src?: string) => (
  <LogoTile src={src} className="w-10 h-10 rounded-2xl" fallbackClassName="bg-brand-600">
    <span>default mark</span>
  </LogoTile>
);

describe('LogoTile', () => {
  it('shows the default mark while the business has no logo', () => {
    const { container } = render(tile(undefined));
    expect(screen.getByText('default mark')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it("shows the business's own logo once it has one", () => {
    const { container } = render(tile('/logo.png'));
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/logo.png');
    expect(screen.queryByText('default mark')).toBeNull();
  });

  it('falls back to the default mark when the image cannot load, and tries again for a new one', () => {
    const { container, rerender } = render(tile('/broken.png'));
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByText('default mark')).toBeTruthy();
    rerender(tile('/fixed.png'));
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/fixed.png');
  });
});

describe('the top bar', () => {
  const brand = (business: object) =>
    render(<HeaderBrand business={business as any} copiedUrl={false} onCopyMenuUrl={() => {}} />);

  it("shows the business's logo in place of the coffee cup", () => {
    const { container } = brand({
      name: 'Brew House',
      slug: 'brew-house',
      logoUrl: '/api/v1/public/images/abc',
    });
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/api/v1/public/images/abc');
    expect(container.querySelector('svg.lucide-coffee')).toBeNull();
    expect(screen.getByText('Brew House')).toBeTruthy();
  });

  it('keeps the coffee cup until a logo is set', () => {
    const { container } = brand({ name: 'Brew House', slug: 'brew-house' });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.lucide-coffee')).toBeTruthy();
  });
});

describe('editing the logo in Settings', () => {
  const header = (over: object = {}) =>
    render(
      <BusinessHeader
        business={{ name: 'Brew House', slug: 'brew-house' }}
        copiedUrl={false}
        onCopyMenuUrl={() => {}}
        onUploadLogo={vi.fn()}
        onRemoveLogo={vi.fn()}
        {...over}
      />,
    );

  it('lets the owner pick an image from the device', () => {
    const onUploadLogo = vi.fn();
    const { container } = header({ onUploadLogo });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUploadLogo).toHaveBeenCalledWith(file);
  });

  it('shows the camera button, and the business initial until there is a logo', () => {
    header();
    expect(screen.getByRole('button', { name: 'Change logo' })).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove logo' })).toBeNull();
  });

  it('offers Remove logo only once there is one, and removes it', () => {
    const onRemoveLogo = vi.fn();
    const { container } = header({
      business: { name: 'Brew House', slug: 'b', logoUrl: '/logo.png' },
      onRemoveLogo,
    });
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/logo.png');
    fireEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
    expect(onRemoveLogo).toHaveBeenCalled();
  });

  it('is only a picture for a viewer who may not change it', () => {
    header({
      onUploadLogo: undefined,
      onRemoveLogo: undefined,
      business: { name: 'Brew House', slug: 'b', logoUrl: '/logo.png' },
    });
    expect(screen.queryByRole('button', { name: 'Change logo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove logo' })).toBeNull();
  });

  it('disables the buttons while a change is being saved', () => {
    header({ savingLogo: true, business: { name: 'Brew House', slug: 'b', logoUrl: '/logo.png' } });
    expect(
      (screen.getByRole('button', { name: 'Change logo' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Remove logo' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('works on the phone Settings tab too', () => {
    const onUploadLogo = vi.fn();
    const props = {
      business: { name: 'Brew House', slug: 'brew-house' },
      subscription: null,
      upiVpaInput: '',
      setUpiVpaInput: vi.fn(),
      savingUpiVpa: false,
      onSaveUpiVpa: vi.fn(),
      savingGstin: false,
      onSaveGstin: vi.fn(),
      savingTaxRate: false,
      onSaveTaxRate: vi.fn(),
      publicMenuUrl: 'https://x.test/c/b',
      copiedUrl: false,
      onCopyMenuUrl: vi.fn(),
      savingLogo: false,
      onUploadLogo,
      onRemoveLogo: vi.fn(),
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
    } as any;
    const { container } = render(<SettingsPanelMobile {...props} />);
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(onUploadLogo).toHaveBeenCalledWith(file);
  });
});

describe('the top-bar logo', () => {
  const brand = (onLogoClick?: () => void) =>
    render(
      <HeaderBrand
        business={{ name: 'Brew House', slug: 'b' }}
        copiedUrl={false}
        onCopyMenuUrl={vi.fn()}
        onLogoClick={onLogoClick}
      />,
    );

  it('opens Settings, where the logo is changed, when it is clicked', () => {
    const onLogoClick = vi.fn();
    brand(onLogoClick);
    fireEvent.click(screen.getByRole('button', { name: 'Change logo in Settings' }));
    expect(onLogoClick).toHaveBeenCalled();
  });

  it('is only a picture for a user without the Settings tab', () => {
    brand(undefined);
    expect(screen.queryByRole('button', { name: 'Change logo in Settings' })).toBeNull();
  });
});
