import { ChevronRightIcon, LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth, usePolicy, type NavItem } from '@/auth';
import { RoleBadge } from '@/components/common/Badges';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { PageStack, Section } from '@/components/common/Section';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useChapterName } from '@/components/common/useChapterName';
import { DemoRoleSwitcher } from '@/components/layout/DemoRoleSwitcher';
import { useSignOut, useUnreadCount } from '@/components/layout/hooks';
import { NavIcon } from '@/components/layout/NavIcon';
import { CountBadge } from '@/components/layout/NotificationBell';
import { Button } from '@/components/ui/button';
import { useLocalized } from '@/i18n/public';
import { paths } from '@/lib/routes';

function MenuList({ items, unread }: { items: NavItem[]; unread: number }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      {items.map((item) => {
        const badge = item.id === 'notifications' ? unread : 0;
        return (
          <li key={item.id}>
            <Link
              to={item.path}
              className="flex min-h-14 items-center gap-3 px-4 py-3 focus-ring-inset hover:bg-accent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <NavIcon id={item.id} className="size-[1.125rem]" />
              </span>
              <span className="flex-1 font-medium">{t(item.labelKey)}</span>
              {badge > 0 ? (
                <>
                  <CountBadge count={badge} />
                  <span className="sr-only">
                    ({t('common.a11y.unreadNotifications', { count: badge })})
                  </span>
                </>
              ) : null}
              <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Mobile "More": everything not in the bottom bar that the subject may open, preferences
 * (language, theme), the demo role switcher (demo mode only) and sign out. Also reachable on desktop.
 */
export default function MorePage() {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const { member, subject, isDemoMode } = useAuth();
  const policy = usePolicy();
  const unread = useUnreadCount();
  const { signOut, isSigningOut } = useSignOut();
  const chapterName = useChapterName();

  const items = policy.visibleNavItems('mobileMore').filter((item) => item.id !== 'profile');
  const mainItems = items.filter((item) => item.group === 'main');
  const workspaceItems = items.filter((item) => item.group === 'workspace');

  return (
    <>
      <PageHeader title={t('nav.more')} description={t('shell.more.description')} />
      <PageStack>
        {member && subject ? (
          <Link
            to={paths.profile()}
            className="flex items-center gap-4 rounded-lg border bg-card p-4 focus-ring hover:bg-accent"
          >
            <UserAvatar name={member.displayName} seed={member.userId} size="lg" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-heading text-lg font-semibold">
                {text(member.displayName)}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <RoleBadge role={subject.role} />
                {chapterName(member.chapterId) ? (
                  <span className="text-sm text-muted-foreground">
                    {chapterName(member.chapterId)}
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-medium text-primary underline underline-offset-4">
                {t('shell.nav.profileAndSettings')}
              </span>
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        ) : null}

        {mainItems.length > 0 ? (
          <Section title={t('shell.more.browse')}>
            <MenuList items={mainItems} unread={unread} />
          </Section>
        ) : null}

        {workspaceItems.length > 0 ? (
          <Section title={t('nav.groups.workspace')}>
            <MenuList items={workspaceItems} unread={unread} />
          </Section>
        ) : null}

        <Section title={t('shell.more.preferences')}>
          <div className="flex flex-col divide-y rounded-lg border bg-card">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">{t('common.labels.language')}</span>
              <LanguageToggle showNames />
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">{t('theme.label')}</span>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        </Section>

        {isDemoMode ? (
          <div className="rounded-lg border border-dashed border-input/70 bg-card p-4">
            <DemoRoleSwitcher />
          </div>
        ) : null}

        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto sm:self-start"
          onClick={() => void signOut()}
          disabled={isSigningOut}
        >
          <LogOutIcon aria-hidden="true" />
          {t('common.actions.signOut')}
        </Button>
      </PageStack>
    </>
  );
}
