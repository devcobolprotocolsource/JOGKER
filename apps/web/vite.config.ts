import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@app': path.resolve(__dirname, './src/app'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('solid-js') ||
              id.includes('@solidjs/router') ||
              id.includes('@supabase/supabase-js')
            ) {
              return 'vendor';
            }
            if (id.includes('lucide-solid')) {
              return 'lucide';
            }
            if (id.includes('date-fns')) {
              return 'date-fns';
            }
            if (id.includes('zod')) {
              return 'zod';
            }
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
