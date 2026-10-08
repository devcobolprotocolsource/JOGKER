import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin({ generate: 'dom' })],
  resolve: {
    conditions: ['development', 'browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/shared/lib/**/*.ts', 'src/features/*/logic/**/*.ts'],
      thresholds: {
        lines: 85,
      },
    },
  },
});
