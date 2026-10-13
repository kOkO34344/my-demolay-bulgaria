import { BellIcon, CheckCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { DateTime } from '@/components/common/DateDisplay';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessageKey } from '@/data/errors';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/data/hooks';
import type { Notification } from '@/domain';
import { useMessageFormatter } from '@/i18n/public';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { useUnreadCount } from './hooks';

/** Count pill used on the bell and nav items ("9+" above 9). Decorative — pair with an sr label. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.6875rem] leading-none font-bold text-destructive-foreground tabular-nums-lining',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}) {
  const { t } = useTranslation();
  const format = useMessageFormatter();
  const unread = notification.readAt === null;
  return (
    <li>
      <Link
        to={notification.link?.to ?? paths.notifications()}
        onClick={() => onOpen(notification)}
        className="flex gap-3 px-4 py-3 focus-ring-inset hover:bg-accent"
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full',
            unread ? 'bg-primary' : 'bg-transparent',
          )}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {unread ? <span className="sr-only">{t('shell.notifications.unread')}</span> : null}
          <span className={cn('text-sm', unread ? 'font-semibold' : 'font-medium')}>
            {format(notification.title)}
          </span>
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {format(notification.body)}
          </span>
          <DateTime
            value={notification.createdAt}
            format="relative"
            className="text-xs text-muted-foreground"
          />
        </span>
      </Link>
    </li>
  );
}

/**
 * Header bell (md+): unread badge + popover with the latest five notifications, "Mark all as read"
 * and "View all". On phones the shell links the bell straight to the notification centre instead.
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications({ limit: 5 }, { enabled: open });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const label =
    unread > 0
      ? t('shell.notifications.bellLabelUnread', { count: unread })
      : t('shell.notifications.bellLabel');

  const handleOpen = (notification: Notification) => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label}>
          <BellIcon aria-hidden="true" />
          <CountBadge count={unread} className="absolute top-0.5 right-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-sans text-base font-bold">{t('nav.notifications')}</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0 || markAll.isPending}
            onClick={() =>
              markAll.mutate(undefined, {
                onSuccess: () => toast.success(t('shell.notifications.allRead')),
                onError: (error) => {
                  const { key, params } = errorMessageKey(error);
                  toast.error(t(key, params));
                },
              })
            }
          >
            <CheckCheckIcon aria-hidden="true" />
            {t('common.actions.markAllAsRead')}
          </Button>
        </div>
        <div className="max-h-[min(26rem,60dvh)] overflow-y-auto">
          {list.isPending ? (
            <div role="status" className="flex flex-col gap-3 p-4">
              <span className="sr-only">{t('common.states.loading')}</span>
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : list.isError ? (
            <div className="p-3">
              <ErrorState
                error={list.error}
                variant="inline"
                mapStatus={false}
                onRetry={() => void list.refetch()}
              />
            </div>
          ) : list.data.length === 0 ? (
            <div className="px-4">
              <EmptyState
                variant="compact"
                icon={BellIcon}
                title={t('shell.notifications.emptyTitle')}
                description={t('shell.notifications.emptyDescription')}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {list.data.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpen}
                />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOpen(false);
              void navigate(paths.notifications());
            }}
          >
            {t('common.actions.viewAll')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
