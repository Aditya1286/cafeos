import { BRAND_SHADES, BrandPalette } from '@/constants/theme';

/** "#dc2626" or "#d26" -> "220 38 38", the form the --brand-* variables use. Null if not a hex colour. */
export const hexToChannels = (hex: string): string | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const full =
    m[1].length === 3
      ? m[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : m[1];
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** Re-themes the app: sets each --brand-* variable on <html>. Pass "r g b" triplets (or use hexToChannels). */
export const applyBrandPalette = (
  palette: BrandPalette,
  root: HTMLElement = document.documentElement,
) => {
  BRAND_SHADES.forEach((shade) => root.style.setProperty(`--brand-${shade}`, palette[shade]));
};

/** Back to the default palette from index.css. */
export const resetBrandPalette = (root: HTMLElement = document.documentElement) => {
  BRAND_SHADES.forEach((shade) => root.style.removeProperty(`--brand-${shade}`));
};
