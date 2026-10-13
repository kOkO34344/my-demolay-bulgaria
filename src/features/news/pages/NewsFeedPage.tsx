import { NewspaperIcon, SearchXIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { PageStack } from '@/components/common/Section';
import { SegmentedFilter } from '@/components/common/SegmentedFilter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFeed } from '@/data/hooks';
import { ANNOUNCEMENT_FEEDS, type AnnouncementFeed } from '@/domain';

import { PostCard } from '../components/PostCard';

function parseFeed(value: string | null): AnnouncementFeed {
  return (ANNOUNCEMENT_FEEDS as readonly string[]).includes(value ?? '')
    ? (value as AnnouncementFeed)
    : 'all';
}

/**
 * Member news feed: published posts the viewer may see, pinned first then newest. Feed, search and
 * the unread filter live in the URL (?feed=&q=&unread=1) so a filtered view can be shared.
 */
export default function NewsFeedPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const feed = parseFeed(params.get('feed'));
  const search = params.get('q') ?? '';
  const unreadOnly = params.get('unread') === '1';

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const query = useFeed({ feed, search: search || undefined, unreadOnly });
  const posts = query.data ?? [];
  const filtered = feed !== 'all' || search !== '' || unreadOnly;

  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });

  return (
    <>
      <PageHeader title={t('nav.news')} description={t('news.feed.description')} />
      <PageStack>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <SegmentedFilter
            label={t('news.feed.feedLabel')}
            value={feed}
            onValueChange={(value) => setParam('feed', value === 'all' ? null : value)}
            options={ANNOUNCEMENT_FEEDS.map((value) => ({
              value,
              label: t(`news.feed.feeds.${value}`),
            }))}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              label={t('news.feed.searchLabel')}
              placeholder={t('news.feed.searchPlaceholder')}
              value={search}
              onChange={(value) => setParam('q', value.trim() || null)}
              className="sm:w-64"
            />
            <div className="flex min-h-11 items-center gap-2">
              <Switch
                id="news-unread-only"
                checked={unreadOnly}
                onCheckedChange={(checked) => setParam('unread', checked ? '1' : null)}
              />
              <Label htmlFor="news-unread-only" className="font-normal">
                {t('news.feed.unreadOnly')}
              </Label>
            </div>
          </div>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {query.isSuccess ? t('news.feed.resultCount', { count: posts.length }) : ''}
        </p>

        {query.isPending ? (
          <ListSkeleton rows={4} />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isRefetching}
          />
        ) : posts.length === 0 ? (
          filtered ? (
            <EmptyState
              variant="card"
              icon={SearchXIcon}
              title={t('common.states.noResultsTitle')}
              description={
                search
                  ? t('common.states.noResultsFor', { query: search })
                  : unreadOnly
                    ? t('news.feed.allRead')
                    : t('news.feed.emptyFeed')
              }
              action={
                <Button variant="outline" onClick={clearFilters}>
                  {t('common.actions.clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="card"
              icon={NewspaperIcon}
              title={t('news.feed.emptyTitle')}
              description={t('news.feed.emptyDescription')}
            />
          )
        ) : (
          <ul className="flex flex-col gap-3" aria-label={t('nav.news')}>
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </PageStack>
    </>
  );
}
