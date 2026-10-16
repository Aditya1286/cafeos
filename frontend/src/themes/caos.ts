import { DEFAULT_BRAND_PALETTE } from '@/constants/theme';
import type { ThemeDefinition } from './types';

// The built-in look: today's guest pages, unchanged. Every value below is one the pages already
// use (CustomerMenuPage, CustomerOrderTrackingPage, organisms/customer-menu, mascot.css):
//   page      bg-page (the --page-bg tint from index.css)    surface  bg-white
//   raised    bg-slate-100                                    line     border-slate-200
//   ink       text-slate-900                                  muted    text-slate-500
//   cards     rounded-3xl; buttons rounded-2xl; chips rounded-full; shadow-sm
//   font      Tailwind's `font-sans`, which index.html loads, so no stylesheet is added here
// It is the fallback for a café with no theme, an unknown theme id, or the master switch off.
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
    raised: '241 245 249',
    line: '226 232 240',
    ink: '15 23 42',
    muted: '100 116 139',
    onAccent: '255 255 255',
    accent: DEFAULT_BRAND_PALETTE,
    radiusCard: '1.5rem',
    radiusChip: '9999px',
    radiusButton: '1rem',
    radiusImage: '1.5rem',
    cardShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    // "Popular" today is a white pill with emerald-700 text; there is no House special yet, so it
    // takes a soft tint of the accent.
    badgeSpecial: { bg: '254 226 226', fg: '153 27 27' },
    badgePopular: { bg: '255 255 255', fg: '4 120 87' },
    coverFallback: 'rgb(241 245 249)',
    // The mascot's red hat band, and its dark speech bubble (white at 18% over #15110f).
    mascotBand: '220 38 38',
    bubbleBg: '21 17 15',
    bubbleFg: '246 231 200',
    bubbleBorder: '63 60 58',
  },
  variants: [{ id: 'default', name: 'Default', swatch: '#dc2626', tokens: {} }],
};
