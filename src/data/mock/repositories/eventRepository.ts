import {
  can,
  canCancelEvent,
  canCreateEvent,
  canManageAttendance,
  canManageEvent,
  canPublishEvent,
  canViewAttendance,
  canViewEvent,
} from '@/auth/policy';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { EventRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject } from '@/data/store';
import {
  canRecordAttendanceAt,
  countGoing,
  evaluateRsvp,
  hasEventEnded,
  RSVP_REJECTION_MESSAGE_KEYS,
} from '@/domain/rules/events';
import { participantAccess, visibleParticipantStatuses } from '@/domain/rules/participants';
import {
  computeTranslationStatus,
  fieldWithFallback,
  titleWithFallback,
} from '@/domain/rules/translations';
import {
  attendanceRecordsSchema,
  cancelEventSchema,
  capacitySchema,
  eventCreateSchema,
  eventInputSchema,
  eventNoteSchema,
  eventReadyIssues,
  rsvpStatusSchema,
} from '@/domain/schemas';
import {
  PARTICIPANT_VISIBILITIES,
  type AttendanceEntry,
  type AttendanceRecord,
  type AuditAction,
  type AuditMetadataValue,
  type CalendarExport,
  type Event,
  type EventInput,
  type EventNote,
  type EventView,
  type ID,
  type MessageParam,
  type Participant,
  type RSVP,
  type Subject,
} from '@/domain';
import { toSofiaMonthKey } from '@/i18n/format';
import { vmsg } from '@/i18n/validation';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';
import { STORAGE_KEYS, sessionStore } from '@/lib/storage';
import { z } from 'zod';

import { assertNoFieldErrors, matchesSearch, msg, personRef, validateInput } from '../helpers';
import { isLocalTo } from '../services/audience';
import { dateText, participantVisibilityLabel } from '../services/labels';
import { notifyUsers } from '../services/notify';
import { activeUserSubjects } from '../services/subjects';
import { toEventView, totalsForEvent } from '../services/views';

/**
 * Events, RSVPs, attendance and organizer notes — emulated FastAPI endpoints with server-side
 * policy checks, RSVP rules (deadline, capacity, cancelled/draft/past), audit entries and
 * notifications (published → audience, updated/cancelled → people who replied going/maybe).
 */

const RSVP_ORDER: Record<RSVP['status'], number> = { going: 0, maybe: 1, not_going: 2 };

function visibleEvent(subject: Subject, eventId: ID): Event {
  const event = db.get('events', eventId);
  if (!event || !canViewEvent(subject, event)) throw new NotFoundError('event', eventId);
  return event;
}

function rsvpsOf(eventId: ID): RSVP[] {
  return db.find('rsvps', (r) => r.eventId === eventId);
}

function assertChapterExists(chapterId: ID | null): void {
  if (chapterId && !db.get('chapters', chapterId)) {
    throw new ValidationError({ chapterId: 'messages.validation.unknownChapter' });
  }
}

function auditEvent(
  subject: Subject,
  action: AuditAction,
  event: Event,
  key: string,
  params: Record<string, MessageParam> = {},
  metadata: Record<string, AuditMetadataValue> = {},
): void {
  appendAudit(subject, {
    action,
    entityType: 'event',
    entityId: event.id,
    chapterId: event.chapterId,
    summary: msg(`messages.audit.${key}`, { title: titleWithFallback(event.translations), ...params }),
    metadata: { status: event.status, ...metadata },
  });
}

/** People who should hear about a newly published event. */
function audienceOf(event: Event): ID[] {
  return activeUserSubjects()
    .filter((u) => canViewEvent(u.subject, event))
    .filter((u) => event.chapterId === null || isLocalTo(u.subject, [event.chapterId]))
    .map((u) => u.userId);
}

/** People who replied going / maybe (they get updates and cancellations). */
function interestedIn(eventId: ID): ID[] {
  return rsvpsOf(eventId)
    .filter((r) => r.status !== 'not_going')
    .map((r) => r.userId);
}

function eventLink(event: Event) {
  return { to: paths.eventDetail(event.id), entityType: 'event' as const, entityId: event.id };
}

function notifyPublished(subject: Subject, event: Event): void {
  notifyUsers(audienceOf(event), {
    category: 'events',
    title: msg('messages.notifications.eventPublished.title', {
      title: titleWithFallback(event.translations),
    }),
    body: msg('messages.notifications.eventPublished.body', {
      date: dateText(event.startsAt),
      summary: fieldWithFallback(event.translations, 'summary'),
    }),
    link: eventLink(event),
    actorId: subject.userId,
  });
}

function translationsOf(input: EventInput): Event['translations'] {
  const result: Event['translations'] = {};
  for (const locale of ['en', 'bg'] as const) {
    const value = input.translations[locale];
    if (value && (value.title || value.summary || value.description)) {
      result[locale] = { title: value.title, summary: value.summary, description: value.description };
    }
  }
  return result;
}

function assertReadyToPublish(event: Pick<Event, 'translations' | 'location'>): void {
  assertNoFieldErrors(eventReadyIssues(event));
}

function eligibleAttendees(event: Event): ID[] {
  const ids = new Set<ID>();
  if (event.chapterId) {
    const activeIds = new Set(db.find('users', (u) => u.status === 'active').map((u) => u.id));
    db.find('members', (m) => m.chapterId === event.chapterId && activeIds.has(m.userId)).forEach(
      (m) => ids.add(m.userId),
    );
  }
  rsvpsOf(event.id).forEach((r) => ids.add(r.userId));
  db.find('attendance', (a) => a.eventId === event.id).forEach((a) => ids.add(a.userId));
  return [...ids].filter((id) => !!db.get('members', id));
}

function attendanceSheet(event: Event): AttendanceEntry[] {
  const rsvps = new Map(rsvpsOf(event.id).map((r) => [r.userId, r.status]));
  const records = new Map(
    db.find('attendance', (a) => a.eventId === event.id).map((a) => [a.userId, a]),
  );
  return eligibleAttendees(event)
    .map((userId): AttendanceEntry => {
      const member = db.require('members', userId, 'member');
      return {
        person: personRef(userId),
        chapterId: member.chapterId,
        rsvp: rsvps.get(userId) ?? null,
        record: records.get(userId) ?? null,
      };
    })
    .sort(
      (a, b) =>
        (a.rsvp ? RSVP_ORDER[a.rsvp] : 3) - (b.rsvp ? RSVP_ORDER[b.rsvp] : 3) ||
        a.person.displayName.en.localeCompare(b.person.displayName.en),
    );
}

// ---- .ics export ---------------------------------------------------------------------------

const icsDate = (iso: string): string =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const icsEscape = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Folds a content line at 75 octets (RFC 5545 §3.1) without splitting UTF-8 characters. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** The client's language (the API will read Accept-Language; the mock reads the stored choice). */
function requestLanguage(): 'en' | 'bg' {
  return sessionStore.get(STORAGE_KEYS.language) === 'bg' ? 'bg' : 'en';
}

function buildCalendar(event: Event): CalendarExport {
  const lang = requestLanguage();
  const tr = event.translations[lang] ?? event.translations.en ?? event.translations.bg;
  const location = [event.location.name[lang], event.location.address[lang]]
    .filter((v) => v.trim().length > 0)
    .join(', ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My DeMolay Bulgaria//Member Portal prototype//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@my-demolay-bulgaria.example.org`,
    `DTSTAMP:${icsDate(clock.nowIso())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${icsEscape(tr?.title ?? event.id)}`,
    `DESCRIPTION:${icsEscape([tr?.summary, tr?.description].filter(Boolean).join('\n\n'))}`,
    ...(location ? [`LOCATION:${icsEscape(location)}`] : []),
    ...(event.location.online && event.location.url ? [`URL:${event.location.url}`] : []),
    `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return {
    fileName: `demolay-${event.id}.ics`,
    mimeType: 'text/calendar',
    content: `${lines.map(foldLine).join('\r\n')}\r\n`,
  };
}

// ---------------------------------------------------------------------------------------------

export function createMockEventRepository(): EventRepository {
  return {
    list: (query = {}) =>
      mockCall((): EventView[] => {
        const subject = requireSubject();
        const now = clock.now();
        const when = query.when ?? 'upcoming';
        const includeDrafts = query.includeUnpublished === true || query.status === 'draft';
        return db
          .list('events')
          .filter((e) => canViewEvent(subject, e, now))
          .filter((e) => includeDrafts || e.status !== 'draft')
          .filter((e) => !query.status || query.status === 'all' || e.status === query.status)
          .filter((e) =>
            when === 'all' ? true : when === 'past' ? hasEventEnded(e, now) : !hasEventEnded(e, now),
          )
          .filter((e) => !query.scope || query.scope === 'all' || e.scope === query.scope)
          .filter((e) => !query.chapterId || e.chapterId === query.chapterId)
          .filter((e) => !query.category || query.category === 'all' || e.category === query.category)
          .filter((e) => !query.month || toSofiaMonthKey(e.startsAt) === query.month)
          .filter((e) =>
            matchesSearch(
              query.search,
              e.translations.en?.title,
              e.translations.bg?.title,
              e.translations.en?.summary,
              e.translations.bg?.summary,
              e.location.name,
            ),
          )
          .sort((a, b) =>
            when === 'past' ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt),
          )
          .map((e) => toEventView(e, subject, now));
      }),

    get: (eventId) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        return toEventView(visibleEvent(subject, eventId), subject);
      }),

    create: (input) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const data = validateInput(eventCreateSchema, input);
        assertChapterExists(data.chapterId);
        if (!canCreateEvent(subject, { scope: data.scope, chapterId: data.chapterId })) {
          throw new ForbiddenError('permission_denied', 'event.create');
        }
        const translations = translationsOf(data);
        if (data.publish) assertReadyToPublish({ translations, location: data.location });
        const now = clock.nowIso();
        const scopeTarget = data.chapterId ? { chapterId: data.chapterId } : { level: 'national' as const };
        const event: Event = {
          id: createId('ev'),
          status: data.publish ? 'published' : 'draft',
          scope: data.scope,
          chapterId: data.chapterId,
          category: data.category,
          translations,
          translationStatus: computeTranslationStatus(
            'event',
            undefined,
            undefined,
            translations,
            can(subject, 'translation.review', scopeTarget),
          ),
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          location: data.location,
          organizerId: subject.userId,
          capacity: data.capacity,
          registrationDeadline: data.registrationDeadline,
          participantVisibility: data.participantVisibility,
          notes: [],
          cancelledReason: null,
          cancelledAt: null,
          publishedAt: data.publish ? now : null,
          imageUrl: data.imageUrl,
          createdBy: subject.userId,
          createdAt: now,
          updatedAt: now,
        };
        db.transaction(() => {
          db.upsert('events', event);
          auditEvent(subject, 'event.created', event, 'eventCreated');
          if (event.status === 'published') {
            auditEvent(subject, 'event.published', event, 'eventPublished');
            notifyPublished(subject, event);
          }
        });
        return toEventView(event, subject);
      }),

    update: (eventId, input) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (event.status === 'cancelled') throw new ForbiddenError('invalid_transition');
        if (!canManageEvent(subject, event)) throw new ForbiddenError('permission_denied', 'event.update');
        const data = validateInput(eventInputSchema, input);
        assertChapterExists(data.chapterId);
        const moved = data.scope !== event.scope || data.chapterId !== event.chapterId;
        if (moved && !canCreateEvent(subject, { scope: data.scope, chapterId: data.chapterId })) {
          throw new ForbiddenError('permission_denied', 'event.create');
        }
        const translations = translationsOf(data);
        if (event.status === 'published') assertReadyToPublish({ translations, location: data.location });
        const going = countGoing(rsvpsOf(event.id));
        if (data.capacity !== null && data.capacity < going) {
          throw new ValidationError({
            capacity: vmsg('messages.validation.capacityBelowGoing', { count: going }),
          });
        }
        const scopeTarget = data.chapterId ? { chapterId: data.chapterId } : { level: 'national' as const };
        const updated: Event = {
          ...event,
          scope: data.scope,
          chapterId: data.chapterId,
          category: data.category,
          translations,
          translationStatus: computeTranslationStatus(
            'event',
            event.translationStatus,
            event.translations,
            translations,
            can(subject, 'translation.review', scopeTarget),
          ),
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          location: data.location,
          capacity: data.capacity,
          registrationDeadline: data.registrationDeadline,
          participantVisibility: data.participantVisibility,
          imageUrl: data.imageUrl,
          updatedAt: clock.nowIso(),
        };
        db.transaction(() => {
          db.upsert('events', updated);
          auditEvent(subject, 'event.updated', updated, 'eventUpdated');
          if (updated.capacity !== event.capacity) {
            auditEvent(
              subject,
              'event.capacity_changed',
              updated,
              updated.capacity === null ? 'eventCapacityUnlimited' : 'eventCapacityChanged',
              updated.capacity === null ? {} : { capacity: updated.capacity },
              { from: event.capacity, to: updated.capacity },
            );
          }
          if (updated.participantVisibility !== event.participantVisibility) {
            auditEvent(subject, 'event.visibility_changed', updated, 'eventVisibilityChanged', {
              visibility: participantVisibilityLabel(updated.participantVisibility),
            });
          }
          if (updated.status === 'published') {
            notifyUsers(interestedIn(updated.id), {
              category: 'events',
              title: msg('messages.notifications.eventUpdated.title', {
                title: titleWithFallback(updated.translations),
              }),
              body: msg('messages.notifications.eventUpdated.body'),
              link: eventLink(updated),
              actorId: subject.userId,
            });
          }
        });
        return toEventView(updated, subject);
      }),

    publish: (eventId) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (event.status !== 'draft') throw new ForbiddenError('invalid_transition');
        if (!canPublishEvent(subject, event)) throw new ForbiddenError('permission_denied', 'event.update');
        assertReadyToPublish(event);
        const now = clock.nowIso();
        const published: Event = { ...event, status: 'published', publishedAt: now, updatedAt: now };
        db.transaction(() => {
          db.upsert('events', published);
          auditEvent(subject, 'event.published', published, 'eventPublished');
          notifyPublished(subject, published);
        });
        return toEventView(published, subject);
      }),

    cancel: (eventId, reason) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (event.status !== 'published') throw new ForbiddenError('invalid_transition');
        if (!canCancelEvent(subject, event)) throw new ForbiddenError('permission_denied', 'event.cancel');
        const data = validateInput(cancelEventSchema, { reason });
        const now = clock.nowIso();
        const cancelled: Event = {
          ...event,
          status: 'cancelled',
          cancelledAt: now,
          cancelledReason: data.reason,
          updatedAt: now,
        };
        db.transaction(() => {
          db.upsert('events', cancelled);
          auditEvent(subject, 'event.cancelled', cancelled, 'eventCancelled', { reason: data.reason });
          notifyUsers(interestedIn(event.id), {
            category: 'events',
            title: msg('messages.notifications.eventCancelled.title', {
              title: titleWithFallback(event.translations),
            }),
            body: msg('messages.notifications.eventCancelled.body', { reason: data.reason }),
            link: eventLink(event),
            actorId: subject.userId,
          });
        });
        return toEventView(cancelled, subject);
      }),

    setParticipantVisibility: (eventId, visibility) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (!canManageEvent(subject, event)) throw new ForbiddenError('permission_denied', 'event.update');
        const value = validateInput(z.enum(PARTICIPANT_VISIBILITIES, { error: 'validation.selectOption' }), visibility);
        if (value === event.participantVisibility) return toEventView(event, subject);
        const updated: Event = { ...event, participantVisibility: value, updatedAt: clock.nowIso() };
        db.transaction(() => {
          db.upsert('events', updated);
          auditEvent(subject, 'event.visibility_changed', updated, 'eventVisibilityChanged', {
            visibility: participantVisibilityLabel(value),
          });
        });
        return toEventView(updated, subject);
      }),

    setCapacity: (eventId, capacity) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (!canManageEvent(subject, event)) throw new ForbiddenError('permission_denied', 'event.update');
        const value = validateInput(z.object({ capacity: capacitySchema }), { capacity }).capacity;
        const going = countGoing(rsvpsOf(event.id));
        if (value !== null && value < going) {
          throw new ValidationError({
            capacity: vmsg('messages.validation.capacityBelowGoing', { count: going }),
          });
        }
        if (value === event.capacity) return toEventView(event, subject);
        const updated: Event = { ...event, capacity: value, updatedAt: clock.nowIso() };
        db.transaction(() => {
          db.upsert('events', updated);
          auditEvent(
            subject,
            'event.capacity_changed',
            updated,
            value === null ? 'eventCapacityUnlimited' : 'eventCapacityChanged',
            value === null ? {} : { capacity: value },
            { from: event.capacity, to: value },
          );
        });
        return toEventView(updated, subject);
      }),

    rsvp: (eventId, status) =>
      mockCall((): EventView => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        const requested = validateInput(rsvpStatusSchema, status);
        if (!can(subject, 'event.rsvp', { ownerId: subject.userId })) {
          throw new ForbiddenError('permission_denied', 'event.rsvp');
        }
        const decision = evaluateRsvp(
          {
            event,
            actorUserId: subject.userId,
            targetUserId: subject.userId,
            rsvps: rsvpsOf(event.id),
            now: clock.now(),
          },
          requested,
        );
        if (!decision.allowed) throw new ConflictError(RSVP_REJECTION_MESSAGE_KEYS[decision.reason]);
        db.upsert('rsvps', {
          id: `${event.id}:${subject.userId}`,
          eventId: event.id,
          userId: subject.userId,
          status: requested,
          respondedAt: clock.nowIso(),
        });
        return toEventView(event, subject);
      }),

    myRsvp: (eventId) =>
      mockCall(() => {
        const subject = requireSubject();
        visibleEvent(subject, eventId);
        return db.get('rsvps', `${eventId}:${subject.userId}`) ?? null;
      }),

    listParticipants: (eventId) =>
      mockCall((): Participant[] => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        const now = clock.now();
        if (participantAccess(subject, event, now) !== 'list') {
          throw new ForbiddenError('permission_denied', 'event.participants.read');
        }
        const statuses = new Set(visibleParticipantStatuses(subject, event, now));
        return rsvpsOf(event.id)
          .filter((r) => statuses.has(r.status))
          .map((r): Participant => ({
            person: personRef(r.userId),
            chapterId: db.get('members', r.userId)?.chapterId ?? '',
            status: r.status,
            respondedAt: r.respondedAt,
          }))
          .sort(
            (a, b) =>
              RSVP_ORDER[a.status] - RSVP_ORDER[b.status] ||
              a.person.displayName.en.localeCompare(b.person.displayName.en),
          );
      }),

    participantTotals: (eventId) =>
      mockCall(() => {
        const subject = requireSubject();
        return totalsForEvent(visibleEvent(subject, eventId));
      }),

    listAttendance: (eventId) =>
      mockCall((): AttendanceEntry[] => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (!canViewAttendance(subject, event)) {
          throw new ForbiddenError('permission_denied', 'attendance.read');
        }
        return attendanceSheet(event);
      }),

    recordAttendance: (eventId, records) =>
      mockCall((): AttendanceEntry[] => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (event.status !== 'published') throw new ForbiddenError('invalid_transition');
        if (!canManageAttendance(subject, event)) {
          throw new ForbiddenError('permission_denied', 'attendance.manage');
        }
        if (!canRecordAttendanceAt(event, clock.now())) {
          throw new ConflictError('messages.errors.attendanceNotStarted');
        }
        const data = validateInput(attendanceRecordsSchema, records);
        const eligible = new Set(eligibleAttendees(event));
        if (data.some((r) => !eligible.has(r.userId))) {
          throw new ValidationError({}, 'messages.errors.attendanceNotEligible');
        }
        const recordedAt = clock.nowIso();
        db.transaction(() => {
          for (const record of data) {
            const entry: AttendanceRecord = {
              id: `${event.id}:${record.userId}`,
              eventId: event.id,
              userId: record.userId,
              status: record.status,
              recordedBy: subject.userId,
              recordedAt,
            };
            db.upsert('attendance', entry);
          }
          auditEvent(subject, 'attendance.recorded', event, 'attendanceRecorded', { count: data.length }, {
            count: data.length,
            present: data.filter((r) => r.status === 'present').length,
          });
        });
        return attendanceSheet(event);
      }),

    addNote: (eventId, body) =>
      mockCall((): EventNote => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (!canManageEvent(subject, event)) {
          throw new ForbiddenError('permission_denied', 'event.update');
        }
        const data = validateInput(eventNoteSchema, { body });
        const note: EventNote = {
          id: createId('note'),
          authorId: subject.userId,
          body: data.body,
          createdAt: clock.nowIso(),
        };
        db.transaction(() => {
          db.update('events', event.id, (current) => ({ ...current, notes: [...current.notes, note] }));
          auditEvent(subject, 'event.note_added', event, 'eventNoteAdded');
        });
        return note;
      }),

    exportCalendar: (eventId) =>
      mockCall((): CalendarExport => {
        const subject = requireSubject();
        const event = visibleEvent(subject, eventId);
        if (event.status === 'draft') throw new ForbiddenError('invalid_transition');
        return buildCalendar(event);
      }),
  };
}
