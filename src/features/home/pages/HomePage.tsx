import { ArrowRightIcon, CalendarIcon, NewspaperIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useAuth, usePolicy } from '@/auth';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ListSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { useChapterName } from '@/components/common/useChapterName';
import { useEvents, useFeed } from '@/data/hooks';
import { isRegistrationOpen } from '@/domain/rules';
import { EventCard } from '@/features/events/components/EventCard';
import { PostCard } from '@/features/news/components/PostCard';
import { useLocalized } from '@/i18n/public';
import { clock } from '@/lib/clock';
import { paths } from '@/lib/routes';

import { OnboardingReminder } from '../components/OnboardingReminder';

const KEY_DATES = 4;
const LATEST_NEWS = 3;

type DayPart = 'morning' | 'afternoon' | 'evening';

/** Part of the day in Sofia, for the greeting. */
function dayPart(now: Date): DayPart {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Europe/Sofia',
    }).format(now),
  );
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function HomeSection({
  id,
  title,
  viewAll,
  children,
}: {
  id: string;
  title: string;
  viewAll: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        <Link
          to={viewAll.to}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-bold text-primary underline-offset-4 focus-ring hover:underline pointer-coarse:min-h-11"
        >
          {viewAll.label}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function KeyDates() {
  const { t } = useTranslation();
  const query = useEvents({ when: 'upcoming' });
  const events = query.data?.filter((event) => event.status === 'published') ?? [];
  const now = clock.now();
  const awaitingReply = events.filter(
    (event) => event.myRsvp === null && isRegistrationOpen(event, now),
  ).length;

  return (
    <HomeSection
      id="home-key-dates"
      title={t('home.keyDates.title')}
      viewAll={{ to: paths.events(), label: t('home.keyDates.viewAll') }}
    >
      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          variant="inline"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : events.length === 0 ? (
        <EmptyState
          variant="card"
          icon={CalendarIcon}
          title={t('events.list.emptyTitle')}
          description={t('events.list.emptyDescription')}
        />
      ) : (
        <>
          {awaitingReply > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('home.keyDates.awaitingReply', { count: awaitingReply })}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {events.slice(0, KEY_DATES).map((event) => (
              <li key={event.id}>
                <EventCard event={event} headingLevel={3} />
              </li>
            ))}
          </ul>
        </>
      )}
    </HomeSection>
  );
}

function LatestNews() {
  const { t } = useTranslation();
  const query = useFeed({ limit: LATEST_NEWS });
  const posts = query.data ?? [];

  return (
    <HomeSection
      id="home-latest-news"
      title={t('home.news.title')}
      viewAll={{ to: paths.news(), label: t('home.news.viewAll') }}
    >
      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState
          variant="inline"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          variant="card"
          icon={NewspaperIcon}
          title={t('news.feed.emptyTitle')}
          description={t('news.feed.emptyDescription')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} headingLevel={3} compact />
            </li>
          ))}
        </ul>
      )}
    </HomeSection>
  );
}

/**
 * Home: a greeting, the next key dates (with how many still need a reply) and the latest posts.
 * Sections only appear when the viewer may open the page they link to.
 */
export default function HomePage() {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const { member } = useAuth();
  const policy = usePolicy();
  const chapterName = useChapterName();
  const firstName = member ? text(member.firstName) : '';
  const chapter = member ? chapterName(member.chapterId) : null;
  const showEvents = policy.canAccessRoute('events');
  const showNews = policy.canAccessRoute('news');

  return (
    <>
      <PageHeader
        title={t(`home.greeting.${dayPart(clock.now())}`, { name: firstName })}
        documentTitle={t('nav.home')}
        description={chapter ? t('home.chapterLine', { chapter }) : undefined}
      />
      <OnboardingReminder />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {showEvents ? <KeyDates /> : null}
        {showNews ? <LatestNews /> : null}
      </div>
    </>
  );
}
