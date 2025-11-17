import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: './src/manifest.json',
      watchFilePaths: ['src/**/*'],
      browser: 'chrome',
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  publicDir: 'public',
});
