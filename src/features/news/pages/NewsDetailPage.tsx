import { FileTextIcon, PinIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AudienceBadge } from '@/components/common/Badges';
import { DateTime } from '@/components/common/DateDisplay';
import { ErrorState } from '@/components/common/ErrorState';
import { DetailSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { PlainTextBody, TranslationFallbackNote } from '@/components/common/PlainTextBody';
import { PageStack, Section } from '@/components/common/Section';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useMarkPostRead, usePost, useRelatedPosts } from '@/data/hooks';
import type { AnnouncementView } from '@/domain';
import { useFormatters, useLocalized } from '@/i18n/public';
import { paths } from '@/lib/routes';

import { PostCard } from '../components/PostCard';

function Attachments({ post }: { post: AnnouncementView }) {
  const { t } = useTranslation();
  const { fileSize } = useFormatters();
  if (post.attachments.length === 0) return null;
  return (
    <Section title={t('common.labels.attachments')} headingLevel={2}>
      <ul className="divide-y rounded-lg border bg-card">
        {post.attachments.map((attachment) => (
          <li key={attachment.id} className="flex items-center gap-3 px-4 py-3">
            <FileTextIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-medium">{attachment.name}</span>
            <span className="shrink-0 text-sm text-muted-foreground uppercase">
              {attachment.fileType} · {fileSize(attachment.size)}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RelatedPosts({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const related = useRelatedPosts(postId);
  if (!related.data || related.data.length === 0) return null;
  return (
    <Section title={t('news.detail.related')} headingLevel={2}>
      <ul className="grid gap-3 md:grid-cols-2">
        {related.data.map((post) => (
          <li key={post.id}>
            <PostCard post={post} headingLevel={3} compact />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * One post: title, author, date, audience, body (plain-text paragraphs), attachments and related
 * posts. Opening it marks it read once. Content missing in the UI language falls back to the other
 * language with a visible note and the correct `lang` attribute.
 */
export default function NewsDetailPage() {
  const { t } = useTranslation();
  const { postId = '' } = useParams();
  const { pick, text } = useLocalized();
  const query = usePost(postId);
  const markRead = useMarkPostRead();
  const markedRef = useRef<string | null>(null);

  const post = query.data;
  const content = post ? pick(post.translations) : null;

  useEffect(() => {
    if (!post || post.isRead || markedRef.current === post.id) return;
    markedRef.current = post.id;
    markRead.mutate(post.id);
  }, [post, markRead]);

  const backLink = { to: paths.news(), label: t('news.detail.back') };

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('nav.news')} backLink={backLink} documentTitle={null} />
        <DetailSkeleton />
      </>
    );
  }
  if (query.isError || !post || !content) {
    return (
      <>
        <PageHeader title={t('nav.news')} backLink={backLink} documentTitle={null} />
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={<span lang={content.lang}>{content.value?.title}</span>}
        documentTitle={content.value?.title ?? null}
        backLink={backLink}
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <UserAvatar
                name={post.author.displayName}
                seed={post.author.id}
                size="sm"
                decorative
              />
              <span>
                <span className="sr-only">{t('common.labels.author')}: </span>
                {text(post.author.displayName)}
              </span>
            </span>
            {post.publishedAt ? (
              <span className="text-muted-foreground">
                {t('common.labels.publishedAt')}{' '}
                <DateTime value={post.publishedAt} format="dateLong" />
              </span>
            ) : null}
            <AudienceBadge audience={post.audience} />
            {post.pinned ? (
              <span className="inline-flex items-center gap-1 font-bold">
                <PinIcon aria-hidden="true" className="size-3.5" />
                {t('news.pinned')}
              </span>
            ) : null}
          </div>
        }
      />
      <PageStack>
        <article className="flex max-w-prose flex-col gap-5">
          {content.isFallback ? <TranslationFallbackNote shownLang={content.lang} /> : null}
          {content.value?.summary ? (
            <p lang={content.lang} className="font-heading text-xl leading-relaxed">
              {content.value.summary}
            </p>
          ) : null}
          <PlainTextBody text={content.value?.body} lang={content.lang} />
        </article>
        <Attachments post={post} />
        <RelatedPosts postId={post.id} />
      </PageStack>
    </>
  );
}
