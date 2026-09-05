/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // React ships via esm.sh importmap (see index.html) so every build artifact
      // stays small enough for the GitHub Contents API used by the deploy.
      external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/math/')) return 'math';
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CEO Decision Machine',
        short_name: 'CDM',
        description: 'Quantitative acquisition decision support for sub-$20K MRR SaaS',
        theme_color: '#0F172A',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // React runtime CDN (importmap) — cache-first, long-lived.
            urlPattern: /^https:\/\/esm\.sh\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'esm-cdn',
              expiration: { maxEntries: 32, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Future API backend: network-first (Phase 2+). Harmless while client-only.
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
