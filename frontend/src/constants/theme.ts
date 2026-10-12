// The default brand palette (Tailwind red), as "r g b" triplets. These are the values behind the
// --brand-* CSS variables declared in index.css; keep the two in step. A different palette can be
// applied at runtime with applyBrandPalette (utils/theme.ts).
export const BRAND_SHADES = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

export type BrandShade = (typeof BRAND_SHADES)[number];
export type BrandPalette = Record<BrandShade, string>;

export const DEFAULT_BRAND_PALETTE: BrandPalette = {
  '50': '254 242 242',
  '100': '254 226 226',
  '200': '254 202 202',
  '300': '252 165 165',
  '400': '248 113 113',
  '500': '239 68 68',
  '600': '220 38 38',
  '700': '185 28 28',
  '800': '153 27 27',
  '900': '127 29 29',
  '950': '69 10 10',
};
