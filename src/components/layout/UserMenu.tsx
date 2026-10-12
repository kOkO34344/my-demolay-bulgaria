import { ChevronDownIcon, LogOutIcon, UserRoundIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth } from '@/auth';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { labelKeys, useLocalized } from '@/i18n/public';
import { paths } from '@/lib/routes';

import { useSignOut } from './hooks';

/** Header account menu: name, effective role, Profile & settings, Sign out. */
export function UserMenu() {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const { member, subject, demoOverride } = useAuth();
  const { signOut, isSigningOut } = useSignOut();
  if (!member || !subject) return null;
  const name = text(member.displayName);
  const roleLabel = t(labelKeys.role(subject.role));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 px-1.5 lg:pr-2"
          aria-label={t('shell.userMenu.label', { name })}
        >
          <UserAvatar name={member.displayName} seed={member.userId} size="sm" />
          <span className="hidden min-w-0 flex-col items-start text-left leading-tight xl:flex">
            <span className="max-w-40 truncate text-sm font-semibold">{name}</span>
            <span className="max-w-40 truncate text-xs font-normal text-muted-foreground">
              {roleLabel}
            </span>
          </span>
          <ChevronDownIcon aria-hidden="true" className="hidden text-muted-foreground xl:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar name={member.displayName} seed={member.userId} size="md" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
            {demoOverride ? (
              <span className="mt-0.5 text-xs text-muted-foreground">
                {t('shell.userMenu.demoRoleActive')}
              </span>
            ) : null}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={paths.profile()}>
            <UserRoundIcon aria-hidden="true" />
            {t('shell.nav.profileAndSettings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isSigningOut} onSelect={() => void signOut()}>
          <LogOutIcon aria-hidden="true" />
          {t('common.actions.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
