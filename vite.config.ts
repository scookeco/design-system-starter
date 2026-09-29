import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Library build: the design system as one ES module plus one stylesheet.
export default defineConfig({
  plugins: [react()],
  // No static files: public/ belongs to the app build (vite.app.config.ts). Off here, the library
  // build never copies it into dist/, and Storybook (which merges this config) serves only its own
  // staticDirs (.storybook/public).
  publicDir: false,
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//, /^react-aria-components($|\/)/, /^@internationalized\//],
    },
    sourcemap: true,
  },
});
