/**
 * Central registry of brand marks and photos. Rules: docs/DESIGN-SYSTEM.md §2. Swap files for
 * officially supplied assets here — never hard-code asset paths in components. Never recolour,
 * stretch, rotate, outline or animate the marks; use `object-fit: contain`; full-colour lockup on
 * white and light neutrals, white lockup on Oxford Blue and photography.
 *
 * Interim: the Bulgarian seal stays in the app chrome until DeMolay International answers the
 * Bulgaria jurisdictional logo request (DESIGN-SYSTEM.md §11.1). The approved interim mark is the DI
 * lockup plus a Bulgarian wordmark set in Lato, and favicon/app icon should derive from the DI emblem
 * (§2) — switching needs product-owner approval (docs/DECISIONS.md 2026-10-13).
 */

export interface BrandAsset {
  src: string;
  /** i18n key for the alt text ('' alt when decorative next to the product name). */
  altKey: string;
  width: number;
  height: number;
}

export const BRAND_ASSETS = {
  /** DeMolay Bulgaria wordmark (light backgrounds) — login page. */
  logo: {
    src: '/brand/demolay-bulgaria-logo.png',
    altKey: 'brand.logoAlt',
    width: 1960,
    height: 631,
  },
  /** Round "Order of DeMolay – Bulgaria" seal — sidebar/header mark at 32–48 px (max ~100 px). */
  seal: {
    src: '/brand/demolay-bulgaria-seal.png',
    altKey: 'brand.sealAlt',
    width: 204,
    height: 204,
  },
  /** DeMolay International lockup (secondary use). */
  internationalLogo: {
    src: '/brand/demolay-international-logo.png',
    altKey: 'brand.internationalLogoAlt',
    width: 1220,
    height: 393,
  },
  /** DeMolay International emblem, small sizes (a 1024 px master is in public/brand for icons). */
  emblem: {
    src: '/brand/demolay-emblem-300.png',
    altKey: 'brand.emblemAlt',
    width: 300,
    height: 300,
  },
} as const satisfies Record<string, BrandAsset>;

/** CC0 photos (Wikimedia Commons). Never present them as DeMolay events, members or venues. */
export const PHOTOS = {
  nevskyDome: {
    src: '/images/sofia-alexander-nevsky-dome.jpg',
    altKey: 'brand.photos.nevskyDome',
    width: 1920,
    height: 1281,
  },
  nevskyBelltower: {
    src: '/images/sofia-alexander-nevsky-belltower.jpg',
    altKey: 'brand.photos.nevskyBelltower',
    width: 1280,
    height: 1910,
  },
  vitosha: {
    src: '/images/vitosha-from-sofia.jpg',
    altKey: 'brand.photos.vitosha',
    width: 1920,
    height: 1082,
  },
  tsarevets: {
    src: '/images/veliko-tarnovo-tsarevets-walls.jpg',
    altKey: 'brand.photos.tsarevets',
    width: 1200,
    height: 1600,
  },
} as const satisfies Record<string, BrandAsset>;
