import {
  BanIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CircleXIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { toast } from 'sonner';

import { usePolicy } from '@/auth';
import { StatusBadge } from '@/components/common/Badges';
import { DateTime } from '@/components/common/DateDisplay';
import { ErrorState } from '@/components/common/ErrorState';
import { KeyValueList } from '@/components/common/KeyValueList';
import { DetailSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { PlainTextBody, TranslationFallbackNote } from '@/components/common/PlainTextBody';
import { PageStack, Section, SectionCard } from '@/components/common/Section';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey } from '@/data/errors';
import { useEvent, useExportEventCalendar, useParticipants, useRsvp } from '@/data/hooks';
import { RSVP_STATUSES, type EventView, type Participant, type RsvpStatus } from '@/domain';
import {
  hasEventEnded,
  registrationClosesAt,
  RSVP_REJECTION_MESSAGE_KEYS,
  ownRsvpOptions,
} from '@/domain/rules';
import { labelKeys } from '@/i18n/labels';
import { useFormatters, useLocalized } from '@/i18n/public';
import { clock } from '@/lib/clock';
import { downloadTextFile } from '@/lib/download';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { eventUrgency } from '../eventUrgency';

const RSVP_ICONS: Record<RsvpStatus, LucideIcon> = {
  going: CircleCheckIcon,
  maybe: CircleHelpIcon,
  not_going: CircleXIcon,
};

/**
 * Reply buttons. Each option is enabled or disabled by the same rule the server applies
 * (rsvpOptions); when replies are closed the reason is shown as text. The current reply is marked
 * with aria-pressed, a filled surface and a check icon.
 */
function RsvpPanel({ event }: { event: EventView }) {
  const { t } = useTranslation();
  const rsvp = useRsvp();
  const options = ownRsvpOptions({
    event,
    current: event.myRsvp,
    othersGoing: event.totals.going - (event.myRsvp === 'going' ? 1 : 0),
    now: clock.now(),
  });
  const closed = Object.values(options).every((option) => !option.allowed)
    ? options.not_going
    : null;

  const reply = (status: RsvpStatus) => {
    if (status === event.myRsvp) return;
    rsvp.mutate(
      { eventId: event.id, status },
      {
        onSuccess: () =>
          toast.success(t('events.rsvp.saved', { status: t(labelKeys.rsvp(status)) })),
        onError: (error) => {
          const { key, params } = errorMessageKey(error);
          toast.error(t(key, params));
        },
      },
    );
  };

  if (closed && !closed.allowed) {
    return (
      <SectionCard title={t('events.rsvp.title')} headingLevel={2}>
        <div className="flex flex-col gap-2">
          {event.myRsvp ? (
            <p className="flex flex-wrap items-center gap-2">
              {t('events.rsvp.yourReply')} <StatusBadge kind="rsvp" status={event.myRsvp} />
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t(RSVP_REJECTION_MESSAGE_KEYS[closed.reason])}
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t('events.rsvp.title')} headingLevel={2}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label={t('events.rsvp.title')} className="grid gap-2 sm:grid-cols-3">
          {RSVP_STATUSES.map((status) => {
            const Icon = RSVP_ICONS[status];
            const selected = event.myRsvp === status;
            const option = options[status];
            return (
              <Button
                key={status}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="lg"
                aria-pressed={selected}
                disabled={rsvp.isPending || (!option.allowed && !selected)}
                onClick={() => reply(status)}
                className={cn('w-full', selected && 'font-bold')}
              >
                {rsvp.isPending && rsvp.variables?.status === status ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <Icon aria-hidden="true" />
                )}
                {t(labelKeys.rsvp(status))}
              </Button>
            );
          })}
        </div>
        {!options.going.allowed && options.going.reason === 'event.full' ? (
          <p className="text-sm text-muted-foreground">{t('events.rsvp.fullHint')}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('events.rsvp.prompt')}</p>
        )}
      </div>
    </SectionCard>
  );
}

function ParticipantList({ event }: { event: EventView }) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const query = useParticipants(event.id);
  if (!query.data) return null;
  const groups: Array<{ status: RsvpStatus; people: Participant[] }> = (
    ['going', 'maybe'] as const
  ).map((status) => ({ status, people: query.data.filter((p) => p.status === status) }));
  if (groups.every((group) => group.people.length === 0)) return null;

  return (
    <Section title={t('events.detail.participants')} headingLevel={2}>
      <div className="grid gap-4 md:grid-cols-2">
        {groups
          .filter((group) => group.people.length > 0)
          .map((group) => (
            <div key={group.status} className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-sans text-sm font-bold">
                {t(labelKeys.rsvp(group.status))} ({group.people.length})
              </h3>
              <ul className="flex flex-col gap-2">
                {group.people.map((participant) => (
                  <li key={participant.person.id} className="flex items-center gap-2.5">
                    <UserAvatar
                      name={participant.person.displayName}
                      seed={participant.person.id}
                      src={participant.person.avatarUrl}
                      size="sm"
                      decorative
                    />
                    <span className="truncate">{text(participant.person.displayName)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </Section>
  );
}

function OrganizerNotes({ event }: { event: EventView }) {
  const { t } = useTranslation();
  if (event.notes.length === 0) return null;
  return (
    <Section
      title={t('events.detail.notes')}
      description={t('events.detail.notesHint')}
      headingLevel={2}
    >
      <ul className="flex flex-col gap-3">
        {event.notes.map((note) => (
          <li key={note.id} className="rounded-lg border border-dashed bg-card p-4">
            <PlainTextBody text={note.body} className="text-sm" />
            <p className="mt-2 text-xs text-muted-foreground">
              <DateTime value={note.createdAt} format="dateTime" />
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * One event: when and where, the viewer's reply, add-to-calendar, description, participants (when
 * the event shares them) and organizer notes (organizers and officers only).
 */
export default function EventDetailPage() {
  const { t } = useTranslation();
  const { eventId = '' } = useParams();
  const { pick, text } = useLocalized();
  const { dateRange, dateTime, number } = useFormatters();
  const policy = usePolicy();
  const query = useEvent(eventId);
  const exportCalendar = useExportEventCalendar();

  const backLink = { to: paths.events(), label: t('events.detail.back') };
  const event = query.data;

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('nav.events')} backLink={backLink} documentTitle={null} />
        <DetailSkeleton />
      </>
    );
  }
  if (query.isError || !event) {
    return (
      <>
        <PageHeader title={t('nav.events')} backLink={backLink} documentTitle={null} />
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      </>
    );
  }

  const content = pick(event.translations);
  const urgency = eventUrgency(event);
  const ended = hasEventEnded(event, clock.now());
  const showRsvp = policy.canRsvp(event) && !ended;

  const addToCalendar = () =>
    exportCalendar.mutate(event.id, {
      onSuccess: (file) => downloadTextFile(file.fileName, file.content, file.mimeType),
      onError: (error) => {
        const { key, params } = errorMessageKey(error);
        toast.error(t(key, params));
      },
    });

  const { totals } = event;
  const facts = [
    {
      id: 'when',
      label: t('events.detail.when'),
      value: dateRange(event.startsAt, event.endsAt),
    },
    {
      id: 'where',
      label: t('common.labels.location'),
      value: event.location.online ? (
        t('common.labels.online')
      ) : (
        <span className="flex flex-col">
          <span>{text(event.location.name)}</span>
          <span className="text-muted-foreground">{text(event.location.address)}</span>
        </span>
      ),
    },
    {
      id: 'organizer',
      label: t('common.labels.organizer'),
      value: (
        <span className="inline-flex items-center gap-2">
          <UserAvatar
            name={event.organizer.displayName}
            seed={event.organizer.id}
            size="xs"
            decorative
          />
          {text(event.organizer.displayName)}
        </span>
      ),
    },
    {
      id: 'chapter',
      label: t('common.labels.chapter'),
      value: event.chapterName ? text(event.chapterName) : t('audience.scope.national'),
    },
    {
      id: 'deadline',
      label: t('common.labels.registrationDeadline'),
      value: (
        <span className={cn(urgency === 'deadlineSoon' && 'font-bold text-warning')}>
          {dateTime(registrationClosesAt(event))}
        </span>
      ),
      hidden: event.status === 'cancelled' || ended,
    },
    {
      id: 'replies',
      label: t('events.detail.replies'),
      value: (
        <span className="flex flex-col">
          <span>
            {t('events.detail.goingCount', { count: totals.going })}
            {' · '}
            {t('events.detail.maybeCount', { count: totals.maybe })}
          </span>
          <span className="text-muted-foreground">
            {totals.capacity === null
              ? t('events.detail.noLimit')
              : totals.isFull
                ? t('events.flags.full')
                : t('events.detail.capacityLeft', {
                    left: number(totals.spotsLeft ?? 0),
                    capacity: number(totals.capacity),
                  })}
          </span>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={<span lang={content.lang}>{content.value?.title}</span>}
        documentTitle={content.value?.title ?? null}
        backLink={backLink}
        meta={
          <>
            <span className="text-sm font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {t(labelKeys.eventCategory(event.category))}
            </span>
            {event.status !== 'published' ? (
              <StatusBadge kind="event" status={event.status} />
            ) : null}
            {event.myRsvp && event.status !== 'cancelled' ? (
              <StatusBadge kind="rsvp" status={event.myRsvp} />
            ) : null}
          </>
        }
        actions={
          event.status === 'published' && !ended ? (
            <Button variant="outline" onClick={addToCalendar} disabled={exportCalendar.isPending}>
              {exportCalendar.isPending ? (
                <Spinner aria-hidden="true" />
              ) : (
                <CalendarPlusIcon aria-hidden="true" />
              )}
              {t('common.actions.addToCalendar')}
            </Button>
          ) : null
        }
      />
      <PageStack>
        {event.status === 'cancelled' ? (
          <Alert variant="destructive">
            <BanIcon aria-hidden="true" />
            <AlertTitle>{t('events.detail.cancelledTitle')}</AlertTitle>
            {event.cancelledReason ? (
              <AlertDescription>{event.cancelledReason}</AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {showRsvp ? <RsvpPanel event={event} /> : null}
            <article className="flex max-w-prose flex-col gap-4">
              {content.isFallback ? <TranslationFallbackNote shownLang={content.lang} /> : null}
              {content.value?.summary ? (
                <p lang={content.lang} className="font-heading text-xl leading-relaxed">
                  {content.value.summary}
                </p>
              ) : null}
              <PlainTextBody text={content.value?.description} lang={content.lang} />
            </article>
          </div>
          <SectionCard title={t('common.labels.details')} headingLevel={2}>
            <KeyValueList items={facts} layout="stacked" />
          </SectionCard>
        </div>

        {policy.canViewParticipants(event) ? <ParticipantList event={event} /> : null}
        {policy.canViewEventNotes(event) ? <OrganizerNotes event={event} /> : null}
      </PageStack>
    </>
  );
}
