import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * PWA icon generation (consumed by vite-plugin-pwa's `pwaAssets` integration at dev/build time).
 *
 * Source (see docs/DESIGN-SYSTEM.md §2): `public/app-icon-source.png` — a
 * byte-identical copy of the official round "Order of DeMolay – Bulgaria" seal from demolay.bg
 * (`public/brand/demolay-bulgaria-seal.png`). It must live at the root of `public/` because the
 * generator writes the icons next to the source image. The seal is never recoloured or cropped —
 * only scaled, and placed on a padded Dark Navy tile for the maskable and Apple icons.
 * PLACEHOLDER until DeMolay Bulgaria supplies an approved app icon: the seal is only 204 px, so the
 * 512 px icons upscale it ~2× (slightly soft at full size). To rebrand, replace
 * `public/app-icon-source.png` with the approved artwork (ideally ≥ 1024 px, or point `images` at
 * an SVG in `public/`) — favicon.ico, pwa-64/192/512, maskable-512 and apple-touch-180 are all
 * regenerated on the next build. `public/favicon.svg` (core's neutral monogram) is an alternative.
 */
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    transparent: {
      ...minimal2023Preset.transparent,
      padding: 0.04,
    },
    maskable: {
      ...minimal2023Preset.maskable,
      // Seal stays inside the 80 % maskable safe zone.
      padding: 0.3,
      resizeOptions: { background: '#152945' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.22,
      resizeOptions: { background: '#152945' },
    },
  },
  images: ['public/app-icon-source.png'],
});
