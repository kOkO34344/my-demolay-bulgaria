import { PaperclipIcon, PinIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { AudienceBadge } from '@/components/common/Badges';
import { DateTime } from '@/components/common/DateDisplay';
import { UserAvatar } from '@/components/common/UserAvatar';
import type { AnnouncementView } from '@/domain';
import { useLocalized } from '@/i18n/public';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * One published post in a list. The whole card is a single link target (the title link is
 * stretched over the card), so the card is one tab stop and nothing depends on hover.
 * Unread posts carry a dot AND the word "Unread" for screen readers (never colour-only).
 */
export function PostCard({
  post,
  headingLevel = 2,
  compact = false,
}: {
  post: AnnouncementView;
  headingLevel?: 2 | 3;
  /** Home widget: no summary, no audience badges. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { pick, text } = useLocalized();
  const content = pick(post.translations);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const publishedAt = post.publishedAt ?? post.updatedAt;

  return (
    <article
      className={cn(
        'relative flex flex-col gap-2.5 rounded-lg border bg-card p-4 shadow-xs transition-colors focus-within:ring-2 focus-within:ring-ring sm:p-5',
        'hover:border-primary/40',
        !post.isRead && 'border-l-4 border-l-primary',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {post.pinned ? (
          <span className="inline-flex items-center gap-1 font-bold text-foreground">
            <PinIcon aria-hidden="true" className="size-3.5" />
            {t('news.pinned')}
          </span>
        ) : null}
        {!post.isRead ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-primary">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            {t('news.unread')}
          </span>
        ) : null}
        <DateTime value={publishedAt} format="relative" />
      </div>

      <Heading lang={content.lang} className="text-lg leading-snug sm:text-xl">
        <Link
          to={paths.newsDetail(post.id)}
          className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
        >
          {content.value?.title}
        </Link>
      </Heading>

      {!compact && content.value?.summary ? (
        <p lang={content.lang} className="line-clamp-3 text-muted-foreground">
          {content.value.summary}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="inline-flex min-w-0 items-center gap-2">
          <UserAvatar name={post.author.displayName} seed={post.author.id} size="xs" decorative />
          <span className="truncate">{text(post.author.displayName)}</span>
        </span>
        {!compact ? <AudienceBadge audience={post.audience} /> : null}
        {!compact && post.attachments.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <PaperclipIcon aria-hidden="true" className="size-3.5" />
            {t('news.attachmentCount', { count: post.attachments.length })}
          </span>
        ) : null}
      </div>
    </article>
  );
}
