import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SUPPORTED_LOCALES, isLocale, labelKeys, useLocale } from '@/i18n/public';
import { cn } from '@/lib/utils';

export interface LanguageToggleProps {
  /**
   * - `default`: hairline segmented control for light/dark surfaces (header, login, settings)
   * - `sidebar`: for the navy sidebar / navy panels
   */
  variant?: 'default' | 'sidebar';
  /** Show full endonyms ("English | Български") instead of codes (settings pages). */
  showNames?: boolean;
  className?: string;
}

/**
 * EN | BG switch. Changes the language in place (no remount, no sign-out) and updates <html lang>.
 * Each option's accessible name contains its visible code plus the language name in that language.
 */
export function LanguageToggle({
  variant = 'default',
  showNames = false,
  className,
}: LanguageToggleProps) {
  const { t } = useTranslation();
  const { lang, setLanguage } = useLocale();

  return (
    <ToggleGroup
      type="single"
      value={lang}
      onValueChange={(value) => {
        if (isLocale(value) && value !== lang) void setLanguage(value);
      }}
      aria-label={t('common.a11y.languageSwitcher')}
      spacing={0}
      className={cn(
        'rounded-md border p-0.5',
        variant === 'sidebar' ? 'border-sidebar-border bg-sidebar' : 'border-border bg-card',
        className,
      )}
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <ToggleGroupItem
          key={locale}
          value={locale}
          size="sm"
          className={cn(
            'rounded-[4px]! px-2.5 text-xs font-semibold tracking-wide',
            variant === 'sidebar'
              ? 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=on]:bg-sidebar-primary data-[state=on]:text-sidebar-primary-foreground data-[state=on]:hover:bg-sidebar-primary'
              : 'text-muted-foreground',
            showNames && 'px-3 text-sm tracking-normal',
          )}
        >
          {showNames ? (
            <span lang={locale}>{t(labelKeys.languageEndonym(locale))}</span>
          ) : (
            <>
              <span>{t(labelKeys.languageCode(locale))}</span>{' '}
              <span className="sr-only" lang={locale}>
                ({t(labelKeys.languageEndonym(locale))})
              </span>
            </>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
