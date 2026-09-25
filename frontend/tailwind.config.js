// Named text sizes resolve through CSS variables so a surface can shrink its whole type scale
// in one place (see `.dashboard-compact-type` in index.css). The fallbacks are Tailwind's
// defaults, so anywhere that doesn't set the variables renders exactly as stock Tailwind.
const scaledFontSize = (name, size, lineHeight) => [
  `var(--fs-${name}, ${size})`,
  { lineHeight: `var(--lh-${name}, ${lineHeight})` },
];

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        cafe: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          500: '#ea580c',
          600: '#c2410c',
          900: '#431407',
        }
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
      }
    },
  },
  plugins: [],
}
