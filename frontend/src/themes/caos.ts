import type { BrandPalette } from '@/constants/theme';
import type { ThemeDefinition } from './types';

// Tailwind's orange and slate scales, which the guest pages used before café themes existed.
const TAILWIND_ORANGE: BrandPalette = {
  '50': '255 247 237',
  '100': '255 237 213',
  '200': '254 215 170',
  '300': '253 186 116',
  '400': '251 146 60',
  '500': '249 115 22',
  '600': '234 88 12',
  '700': '194 65 12',
  '800': '154 52 18',
  '900': '124 45 18',
  '950': '67 20 7',
};

const TAILWIND_SLATE: BrandPalette = {
  '50': '248 250 252',
  '100': '241 245 249',
  '200': '226 232 240',
  '300': '203 213 225',
  '400': '148 163 184',
  '500': '100 116 139',
  '600': '71 85 105',
  '700': '51 65 85',
  '800': '30 41 59',
  '900': '15 23 42',
  '950': '2 6 23',
};

// The built-in look: today's guest pages, unchanged. Every value below is one the pages used
// before themes (CustomerMenuPage, CustomerOrderTrackingPage, organisms/customer-menu, mascot.css):
//   page      bg-page (the --page-bg tint from index.css)    surface  bg-white
//   raised    bg-slate-100                                    line     border-slate-200
//   ink       text-slate-900                                  muted    text-slate-500
//   accent    orange-*; filled controls are orange-500 with white text
//   neutral   slate-* (every other grey on the pages)
//   cards     rounded-3xl; buttons rounded-2xl; chips rounded-full; shadow-sm
//   font      Tailwind's `font-sans`, which index.html loads, so no stylesheet is added here
//   cover     with no café photo, the same stock coffee photo as before (see the menu page)
//   dish      with no photo, the orange-50 → amber-100 tile
// It is the fallback for a café with no theme, an unknown theme id, or the master switch off, so
// any change here changes every café's guest pages: check them against screenshots.
export const caos: ThemeDefinition = {
  id: 'caos',
  name: 'Caos',
  description: 'The standard Caos look.',
  fonts: {
    display: "'Plus Jakarta Sans', Inter, sans-serif",
    body: "'Plus Jakarta Sans', Inter, sans-serif",
  },
  tokens: {
    page: '253 243 240',
    surface: '255 255 255',
    raised: TAILWIND_SLATE['100'],
    line: TAILWIND_SLATE['200'],
    ink: TAILWIND_SLATE['900'],
    muted: TAILWIND_SLATE['500'],
    onAccent: '255 255 255',
    accent: TAILWIND_ORANGE,
    buttonShade: '500',
    neutral: TAILWIND_SLATE,
    radiusCard: '1.5rem',
    radiusChip: '9999px',
    radiusButton: '1rem',
    radiusImage: '1.5rem',
    cardShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    // "Popular" is a white pill with emerald-700 text, as before. "House special" is new (and only
    // shown when café identity is on); it takes a soft tint of the orange accent.
    badgeSpecial: { bg: TAILWIND_ORANGE['100'], fg: TAILWIND_ORANGE['800'] },
    badgePopular: { bg: '255 255 255', fg: '4 120 87' },
    // Unused on the menu: with no café photo, the caos look keeps the stock coffee photo it always
    // showed (CustomerMenuPage CAOS_STOCK_COVER, an <img> so it renders exactly as before).
    coverFallback: 'rgb(241 245 249)',
    dishFallback: 'linear-gradient(to bottom right, rgb(255 247 237), rgb(254 243 199))',
    // The mascot's red hat band, and its dark speech bubble (white at 18% over #15110f).
    mascotBand: '220 38 38',
    bubbleBg: '21 17 15',
    bubbleFg: '246 231 200',
    bubbleBorder: '63 60 58',
  },
  variants: [{ id: 'default', name: 'Default', swatch: '#f97316', tokens: {} }],
};
