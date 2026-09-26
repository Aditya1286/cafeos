import { defineConfig } from 'vitest/config';
import path from 'path';

// Test-only config, kept separate from vite.config.ts so the app build is untouched. Tests
// live in tests/ (outside src/), so neither `tsc` (include: ["src"]) nor the Vite bundle
// ever pick them up, and tests/ is in .dockerignore.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
  },
});
