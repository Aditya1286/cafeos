// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MenuBannerEditor } from '../src/organisms/dashboard/SettingsPanel/sections';

afterEach(cleanup);

const editor = (business: object, handlers: { onUpload?: any; onRemove?: any } = {}) =>
  render(
    <MenuBannerEditor
      business={business}
      onUpload={handlers.onUpload ?? vi.fn()}
      onRemove={handlers.onRemove ?? vi.fn()}
    />,
  );

describe('MenuBannerEditor', () => {
  it('offers Add banner and no Remove while the café has none', () => {
    editor({ name: 'Brew House' });
    expect(screen.getByRole('button', { name: /Add banner/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    expect(screen.getByText('Using the default banner')).toBeTruthy();
  });

  it('previews the current banner, and can change or remove it', () => {
    const onRemove = vi.fn();
    const { container } = editor({ coverImageUrl: '/banner.png' }, { onRemove });
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/banner.png');
    expect(screen.getByRole('button', { name: /Change banner/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('hands the picked file to the page', () => {
    const onUpload = vi.fn();
    const { container } = editor({}, { onUpload });
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
