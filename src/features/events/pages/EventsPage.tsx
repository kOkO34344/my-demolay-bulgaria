import { CalendarIcon, SearchXIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterSelect } from '@/components/common/FilterSelect';
import { ListSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { PageStack } from '@/components/common/Section';
import { SegmentedFilter } from '@/components/common/SegmentedFilter';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/data/hooks';
import {
  EVENT_CATEGORIES,
  EVENT_SCOPES,
  type EventCategory,
  type EventScope,
  type EventView,
} from '@/domain';
import { labelKeys } from '@/i18n/labels';
import { toSofiaMonthKey, useFormatters } from '@/i18n/public';

import { AudienceInsightsPanel } from '../components/AudienceInsightsPanel';
import { EventCard } from '../components/EventCard';

type Tab = 'upcoming' | 'past';

function oneOf<T extends string>(values: readonly T[], raw: string | null, fallback: T): T {
  return (values as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback;
}

/** Groups events (already sorted by the server) under "October 2026"-style month headings. */
function groupByMonth(events: EventView[]): Array<{ month: string; events: EventView[] }> {
  const groups: Array<{ month: string; events: EventView[] }> = [];
  for (const event of events) {
    const month = toSofiaMonthKey(event.startsAt);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.events.push(event);
    else groups.push({ month, events: [event] });
  }
  return groups;
}

/**
 * Calendar of national and chapter events. Upcoming (soonest first) and past (newest first) tabs,
 * scope, category and search live in the URL (?tab=&scope=&category=&q=).
 */
export default function EventsPage() {
  const { t } = useTranslation();
  const { monthYear } = useFormatters();
  const [params, setParams] = useSearchParams();
  const tab = oneOf<Tab>(['upcoming', 'past'], params.get('tab'), 'upcoming');
  const scope = oneOf<EventScope | 'all'>(['all', ...EVENT_SCOPES], params.get('scope'), 'all');
  const category = oneOf<EventCategory | 'all'>(
    ['all', ...EVENT_CATEGORIES],
    params.get('category'),
    'all',
  );
  const search = params.get('q') ?? '';

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

  const query = useEvents({ when: tab, scope, category, search: search || undefined });
  const events = query.data;
  const groups = useMemo(() => groupByMonth(events ?? []), [events]);
  const filtered = scope !== 'all' || category !== 'all' || search !== '';

  const clearFilters = () =>
    setParams(tab === 'past' ? new URLSearchParams({ tab }) : new URLSearchParams(), {
      replace: true,
    });

  return (
    <>
      <PageHeader title={t('nav.events')} description={t('events.list.description')} />
      <PageStack>
        <AudienceInsightsPanel />
        <div className="flex flex-col gap-3">
          <SegmentedFilter
            label={t('events.list.whenLabel')}
            value={tab}
            onValueChange={(value) => setParam('tab', value === 'upcoming' ? null : value)}
            options={[
              { value: 'upcoming', label: t('events.list.upcoming') },
              { value: 'past', label: t('events.list.past') },
            ]}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <SearchInput
              label={t('events.list.searchLabel')}
              placeholder={t('events.list.searchPlaceholder')}
              value={search}
              onChange={(value) => setParam('q', value.trim() || null)}
              className="col-span-2 sm:col-span-1"
            />
            <FilterSelect
              label={t('common.labels.scope')}
              value={scope}
              onValueChange={(value) => setParam('scope', value === 'all' ? null : value)}
              options={[
                { value: 'all', label: t('events.list.allScopes') },
                ...EVENT_SCOPES.map((value) => ({
                  value,
                  label: t(labelKeys.audienceScope(value)),
                })),
              ]}
              triggerClassName="sm:w-44"
            />
            <FilterSelect
              label={t('common.labels.category')}
              value={category}
              onValueChange={(value) => setParam('category', value === 'all' ? null : value)}
              options={[
                { value: 'all', label: t('events.list.allCategories') },
                ...EVENT_CATEGORIES.map((value) => ({
                  value,
                  label: t(labelKeys.eventCategory(value)),
                })),
              ]}
              triggerClassName="sm:w-48"
            />
          </div>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {query.isSuccess ? t('events.list.resultCount', { count: events?.length ?? 0 }) : ''}
        </p>

        {query.isPending ? (
          <ListSkeleton rows={4} />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isRefetching}
          />
        ) : groups.length === 0 ? (
          filtered ? (
            <EmptyState
              variant="card"
              icon={SearchXIcon}
              title={t('common.states.noResultsTitle')}
              description={
                search
                  ? t('common.states.noResultsFor', { query: search })
                  : t('events.list.noMatches')
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
              icon={CalendarIcon}
              title={tab === 'past' ? t('events.list.emptyPastTitle') : t('events.list.emptyTitle')}
              description={
                tab === 'past'
                  ? t('events.list.emptyPastDescription')
                  : t('events.list.emptyDescription')
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.month} aria-labelledby={`events-month-${group.month}`}>
                <h2
                  id={`events-month-${group.month}`}
                  className="mb-3 font-sans text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase"
                >
                  {monthYear(`${group.month}-15T12:00:00.000Z`)}
                </h2>
                <ul className="flex flex-col gap-3">
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} headingLevel={3} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PageStack>
    </>
  );
}
