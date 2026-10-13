import {
  AlarmClockIcon,
  ClockIcon,
  GlobeIcon,
  LandmarkIcon,
  MapPinIcon,
  MonitorIcon,
  UsersIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { StatusBadge } from '@/components/common/Badges';
import { DateBlock } from '@/components/common/DateDisplay';
import type { EventView } from '@/domain';
import { isRegistrationOpen, registrationClosesAt } from '@/domain/rules';
import { toSofiaDateKey, useFormatters, useLocalized } from '@/i18n/public';
import { labelKeys } from '@/i18n/labels';
import { clock } from '@/lib/clock';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { eventUrgency, type EventUrgency } from '../eventUrgency';

const BORDER: Record<EventUrgency, string> = {
  cancelled: 'border-l-border',
  past: 'border-l-border',
  startingSoon: 'border-l-brand-ruby dark:border-l-brand-ruby-tint',
  deadlineSoon: 'border-l-brand-beacon',
  normal: 'border-l-primary',
};

/**
 * One event in a list: date block, category, title (the card's single link), time, place and the
 * viewer's reply. Every flag is text plus icon, never colour alone.
 */
export function EventCard({
  event,
  headingLevel = 2,
  showChapter = true,
}: {
  event: EventView;
  headingLevel?: 2 | 3;
  showChapter?: boolean;
}) {
  const { t } = useTranslation();
  const { pick, text } = useLocalized();
  const { time, dateRange, relative } = useFormatters();
  const content = pick(event.translations);
  const urgency = eventUrgency(event);
  const muted = urgency === 'cancelled' || urgency === 'past';
  const registrationOpen = isRegistrationOpen(event, clock.now());
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const multiDay = toSofiaDateKey(event.endsAt) !== toSofiaDateKey(event.startsAt);
  const LocationIcon = event.location.online ? MonitorIcon : MapPinIcon;

  return (
    <article
      className={cn(
        'relative flex gap-4 rounded-lg border border-l-4 bg-card p-4 shadow-xs transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/40 sm:p-5',
        BORDER[urgency],
      )}
    >
      <DateBlock date={event.startsAt} muted={muted} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-bold tracking-[0.08em] text-muted-foreground uppercase">
            {t(labelKeys.eventCategory(event.category))}
          </span>
          {event.status !== 'published' ? <StatusBadge kind="event" status={event.status} /> : null}
          {urgency === 'startingSoon' ? (
            <span className="inline-flex items-center gap-1 font-bold text-destructive">
              <AlarmClockIcon aria-hidden="true" className="size-3.5" />
              {t('events.flags.startingSoon')}
            </span>
          ) : null}
        </div>

        <Heading
          lang={content.lang}
          className={cn('text-lg leading-snug', muted && 'text-muted-foreground')}
        >
          <Link
            to={paths.eventDetail(event.id)}
            className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
          >
            {content.value?.title}
          </Link>
        </Heading>

        <ul className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
          <li className="inline-flex items-center gap-1.5">
            <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
            {multiDay
              ? dateRange(event.startsAt, event.endsAt, { style: 'medium' })
              : `${time(event.startsAt)} – ${time(event.endsAt)}`}
          </li>
          <li className="inline-flex min-w-0 items-center gap-1.5">
            <LocationIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">
              {event.location.online ? t('common.labels.online') : text(event.location.name)}
            </span>
          </li>
          {showChapter ? (
            <li className="inline-flex items-center gap-1.5">
              {event.chapterName ? (
                <LandmarkIcon aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <GlobeIcon aria-hidden="true" className="size-4 shrink-0" />
              )}
              {event.chapterName ? text(event.chapterName) : t('audience.scope.national')}
            </li>
          ) : null}
        </ul>

        {event.status === 'cancelled' ? null : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            {event.myRsvp ? <StatusBadge kind="rsvp" status={event.myRsvp} /> : null}
            {urgency === 'deadlineSoon' ? (
              <span className="font-bold text-warning">
                {t('events.flags.registrationCloses', {
                  when: relative(registrationClosesAt(event)),
                })}
              </span>
            ) : null}
            {!muted && event.totals.isFull ? (
              <span className="inline-flex items-center gap-1 font-bold">
                <UsersIcon aria-hidden="true" className="size-4" />
                {t('events.flags.full')}
              </span>
            ) : registrationOpen && event.totals.spotsLeft !== null ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <UsersIcon aria-hidden="true" className="size-4" />
                {t('events.flags.spotsLeft', { count: event.totals.spotsLeft })}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
