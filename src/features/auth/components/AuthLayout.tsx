import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageToggle } from '@/components/common/LanguageToggle';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { SkipLink } from '@/components/layout/SkipLink';
import { BRAND_ASSETS, PHOTOS } from '@/lib/brand';
import { useTheme } from '@/lib/theme';

const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Signed-out frame (login, password recovery).
 *  - lg+: split screen — a tall photo of Sofia's Alexander Nevsky bell tower (CC0) resting on a solid
 *    navy plate with the product name and a single Crown Gold rule; the form column on the right.
 *  - < lg: focused single column (no photo), wordmark above the form.
 *  - EN | BG and theme controls are always in the top-right corner.
 * The official wordmark has navy letters, so dark mode shows the round seal instead (never recoloured).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SkipLink />

      <aside
        aria-label={t('auth.brand.panelLabel')}
        className="relative hidden h-dvh flex-col self-start overflow-hidden bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex"
      >
        <div className="relative min-h-0 flex-1">
          <img
            src={PHOTOS.nevskyBelltower.src}
            width={PHOTOS.nevskyBelltower.width}
            height={PHOTOS.nevskyBelltower.height}
            alt={t(PHOTOS.nevskyBelltower.altKey)}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[35%_6%]"
          />
        </div>
        <div className="relative bg-sidebar px-10 pt-9 pb-8 xl:px-14">
          <div className="flex items-center gap-4">
            <img
              src={BRAND_ASSETS.seal.src}
              width={56}
              height={56}
              alt=""
              className="size-14 shrink-0 object-contain"
            />
            <div className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className="block h-[3px] w-12 rounded-full bg-sidebar-primary"
              />
              <p className="font-heading text-[2rem] leading-none font-semibold tracking-tight text-white xl:text-[2.375rem]">
                {t('app.name')}
              </p>
              <p className="text-base text-sidebar-muted-foreground">{t('app.subtitle')}</p>
            </div>
          </div>
          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-sidebar-foreground/90">
            {t('auth.brand.tagline')}
          </p>
          <p className="mt-8 text-xs text-sidebar-muted-foreground">
            {t('auth.brand.photoCredit')}
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 lg:justify-end lg:px-10">
          <span className="flex min-w-0 flex-col leading-tight lg:hidden">
            <span className="truncate font-heading text-base font-semibold">{t('app.name')}</span>
            <span className="truncate text-xs text-muted-foreground">{t('app.subtitle')}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 justify-center px-4 py-6 outline-none sm:px-6 sm:py-10 lg:items-center lg:px-10"
        >
          <div className="w-full max-w-[25rem]">
            <div className="mb-8 flex">
              {resolvedTheme === 'dark' ? (
                <img
                  src={BRAND_ASSETS.seal.src}
                  width={72}
                  height={72}
                  alt={t(BRAND_ASSETS.seal.altKey)}
                  className="size-[4.5rem] object-contain"
                />
              ) : (
                <img
                  src={BRAND_ASSETS.logo.src}
                  width={220}
                  height={Math.round((220 * BRAND_ASSETS.logo.height) / BRAND_ASSETS.logo.width)}
                  alt={t(BRAND_ASSETS.logo.altKey)}
                  className="h-auto w-[13.75rem] object-contain"
                />
              )}
            </div>
            {children}
          </div>
        </main>

        <footer className="px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:px-6 lg:px-10">
          <p className="mx-auto w-full max-w-[25rem]">
            {t('auth.footer.copyright', { year: COPYRIGHT_YEAR })}
          </p>
        </footer>
      </div>
    </div>
  );
}
