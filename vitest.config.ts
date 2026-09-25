import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['tests/visual/**', 'fixtures/**', 'node_modules/**'],
    environment: 'node',
  },
});
