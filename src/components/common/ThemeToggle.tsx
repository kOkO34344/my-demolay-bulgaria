import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { labelKeys } from '@/i18n/public';
import { THEME_PREFERENCES, isThemePreference, useTheme, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';

const THEME_ICONS: Record<ThemePreference, LucideIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

export interface ThemeToggleProps {
  /**
   * - `menu`: icon button opening Light / Dark / System (header, login)
   * - `segmented`: three labelled segments (profile & settings, More page)
   */
  variant?: 'menu' | 'segmented';
  /** Styling for the navy sidebar. */
  onSidebar?: boolean;
  className?: string;
}

/** Light / dark / system theme control. Applies `.dark` on <html> immediately (session-persisted). */
export function ThemeToggle({ variant = 'menu', onSidebar = false, className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { preference, resolvedTheme, setPreference } = useTheme();

  if (variant === 'segmented') {
    return (
      <ToggleGroup
        type="single"
        value={preference}
        onValueChange={(value) => {
          if (isThemePreference(value)) setPreference(value);
        }}
        aria-label={t('common.a11y.themeSwitcher')}
        spacing={0}
        className={cn('rounded-md border bg-card p-0.5', className)}
      >
        {THEME_PREFERENCES.map((option) => {
          const Icon = THEME_ICONS[option];
          return (
            <ToggleGroupItem
              key={option}
              value={option}
              size="sm"
              className="rounded-[4px]! px-3 text-muted-foreground"
            >
              <Icon aria-hidden="true" />
              {t(labelKeys.theme(option))}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    );
  }

  const CurrentIcon = resolvedTheme === 'dark' ? MoonIcon : SunIcon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            onSidebar &&
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            className,
          )}
          aria-label={t('shell.theme.menuLabel', {
            theme: t(labelKeys.theme(preference)),
          })}
        >
          <CurrentIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          {t('theme.label')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => {
            if (isThemePreference(value)) setPreference(value);
          }}
        >
          {THEME_PREFERENCES.map((option) => {
            const Icon = THEME_ICONS[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon aria-hidden="true" />
                {t(labelKeys.theme(option))}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
