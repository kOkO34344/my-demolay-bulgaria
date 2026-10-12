import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite configuration for My DeMolay Bulgaria.
 *
 * - `@/*` resolves to `src/*` (mirrored in tsconfig.json / tsconfig.app.json / vitest.config.ts).
 * - PWA: manifest + Workbox service worker (offline app shell). Icons are generated at build/dev time
 *   from the source image named in `pwa-assets.config.ts` (currently the DeMolay Bulgaria seal) —
 *   point it at approved DeMolay Bulgaria artwork to rebrand every icon.
 * - Preview runs on a fixed port (4173) so Playwright can rely on it.
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // SHELL: the app registers the SW itself (src/features/shell/pwa/PwaUpdatePrompt.tsx via
      // `virtual:pwa-register/react`) and shows an "update available — Reload" toast.
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
        includeHtmlHeadLinks: true,
        // theme-color is managed at runtime by the ThemeProvider (light/dark) and index.html.
        injectThemeColor: false,
      },
      manifest: {
        id: '/',
        name: 'My DeMolay Bulgaria',
        short_name: 'My DeMolay',
        description:
          'Member Portal for DeMolay Bulgaria — interactive prototype with fictional demo data.',
        lang: 'en',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#F7F6F2',
        // SHELL: same as index.html's <meta name="theme-color"> and THEME_COLORS.light in
        // src/lib/theme/theme.ts (the white app header); the ThemeProvider switches the meta to
        // #132136 in dark mode at runtime.
        theme_color: '#ffffff',
        categories: ['education', 'productivity'],
      },
      workbox: {
        // App shell only (manifest + generated icons are added by the plugin). Brand images and
        // photos are cached at runtime so large originals do not bloat the install.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['brand/**', 'images/**', 'assets/*-greek-*.woff2'],
        navigateFallback: '/index.html',
        // SHELL: file-like paths (/offline.html, /docs/x.pdf …) and /api/ are not SPA routes.
        navigateFallbackDenylist: [/^\/api\//, /\/[^/?]+\.[a-z0-9]+$/i],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // SHELL: navigations the SPA fallback does not handle (denylisted above) → network,
            // falling back to the precached bilingual public/offline.html when offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: { precacheFallback: { fallbackURL: '/offline.html' } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/brand/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mdb-brand',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mdb-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Stable vendor chunks: better long-term caching and no >500 kB single bundle.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|cookie-es)[\\/]/,
              priority: 40,
            },
            {
              name: 'ui',
              test: /node_modules[\\/](radix-ui|@radix-ui|vaul|sonner|cmdk|input-otp|react-day-picker|lucide-react|class-variance-authority|clsx|tailwind-merge|@floating-ui|react-remove-scroll[^\\/]*|aria-hidden)[\\/]/,
              priority: 30,
            },
            {
              name: 'data',
              test: /node_modules[\\/](@tanstack|zod|react-hook-form|@hookform)[\\/]/,
              priority: 20,
            },
            {
              name: 'i18n',
              test: /node_modules[\\/](i18next|react-i18next|date-fns|@date-fns)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
