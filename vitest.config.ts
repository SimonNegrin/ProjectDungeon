import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['experiments/**/*.test.ts', 'src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
