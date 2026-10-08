import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/shared/lib/**/*.ts'],
      thresholds: { lines: 85 },
    },
  },
  build: {
    target: 'es2022',
  },
});
