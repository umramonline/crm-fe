import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'next/navigation': fileURLToPath(
        new URL('./src/shims/next-navigation.ts', import.meta.url),
      ),
    },
  },
});
