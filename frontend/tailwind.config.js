// Named text sizes resolve through CSS variables so a surface can shrink its whole type scale
// in one place (see `.dashboard-compact-type` in index.css). The fallbacks are Tailwind's
// defaults, so anywhere that doesn't set the variables renders exactly as stock Tailwind.
const scaledFontSize = (name, size, lineHeight) => [
  `var(--fs-${name}, ${size})`,
  { lineHeight: `var(--lh-${name}, ${lineHeight})` },
];

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // The theme colour. Each shade reads a CSS variable (an "r g b" triplet set in index.css,
        // red by default) so the whole app can be re-themed at runtime, e.g. per business, by
        // overriding --brand-* on <html> (see utils/theme.ts). Use brand-* for anything that is
        // "the accent colour"; keep red/rose/emerald/amber for meaning (errors, success, warnings).
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        // The dashboards' page background: white by default, a soft charcoal in dark mode (a variable,
        // set in index.css / styles/dashboardTheme.css, so the two modes share one class).
        page: 'rgb(var(--page-bg) / <alpha-value>)',
        cafe: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          500: '#ea580c',
          600: '#c2410c',
          900: '#431407',
        },
      },
      fontSize: {
        xs: scaledFontSize('xs', '0.75rem', '1rem'),
        sm: scaledFontSize('sm', '0.875rem', '1.25rem'),
        base: scaledFontSize('base', '1rem', '1.5rem'),
        lg: scaledFontSize('lg', '1.125rem', '1.75rem'),
        xl: scaledFontSize('xl', '1.25rem', '1.75rem'),
        '2xl': scaledFontSize('2xl', '1.5rem', '2rem'),
        '3xl': scaledFontSize('3xl', '1.875rem', '2.25rem'),
        '4xl': scaledFontSize('4xl', '2.25rem', '2.5rem'),
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
