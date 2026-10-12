import type { ID, ISODateTime, Locale, LocalizedText, PersonRef, Translations } from './common';
import type { TranslationState } from './translations';

export const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_SCOPES = ['national', 'chapter'] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export const EVENT_CATEGORIES = [
  'meeting',
  'ceremony',
  'service',
  'social',
  'education',
  'sports',
  'conference',
  'fundraiser',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Who may see the participant list (totals are always visible to anyone who can see the event). */
export const PARTICIPANT_VISIBILITIES = ['members', 'organizers'] as const;
export type ParticipantVisibility = (typeof PARTICIPANT_VISIBILITIES)[number];

export const RSVP_STATUSES = ['going', 'maybe', 'not_going'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const ATTENDANCE_STATUSES = ['present', 'absent', 'excused'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface EventTranslation {
  title: string;
  summary: string;
  /** Plain text with blank-line paragraphs. */
  description: string;
}

export interface EventLocation {
  name: LocalizedText;
  address: LocalizedText;
  online: boolean;
  /** Meeting link for online events (fictional in the prototype). */
  url: string | null;
}

/** Internal organizer note (visible only to users who can manage the event). */
export interface EventNote {
  id: ID;
  authorId: ID;
  body: string;
  createdAt: ISODateTime;
}

/**
 * An organizational event. Named `Event` per the spec; when a file also needs the DOM `Event`
 * type, import as `import type { Event as OrgEvent } from '@/domain'`.
 */
export interface Event {
  id: ID;
  status: EventStatus;
  scope: EventScope;
  /** Organizing chapter, or null for national events. */
  chapterId: ID | null;
  category: EventCategory;
  translations: Translations<EventTranslation>;
  translationStatus: Record<Locale, TranslationState>;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  location: EventLocation;
  organizerId: ID;
  /** null = unlimited. */
  capacity: number | null;
  /** null = RSVP open until the event starts. */
  registrationDeadline: ISODateTime | null;
  participantVisibility: ParticipantVisibility;
  notes: EventNote[];
  cancelledReason: string | null;
  cancelledAt: ISODateTime | null;
  publishedAt: ISODateTime | null;
  imageUrl: string | null;
  createdBy: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
export type OrgEvent = Event;

export interface ParticipantTotals {
  going: number;
  maybe: number;
  notGoing: number;
  capacity: number | null;
  /** null when capacity is unlimited. */
  spotsLeft: number | null;
  isFull: boolean;
}

/** Event as returned to the UI. `notes` is [] unless the viewer can manage the event. */
export interface EventView extends Event {
  organizer: PersonRef;
  chapterName: LocalizedText | null;
  myRsvp: RsvpStatus | null;
  totals: ParticipantTotals;
}

/** One RSVP (one per user per event). */
export interface RSVP {
  id: ID;
  eventId: ID;
  userId: ID;
  status: RsvpStatus;
  respondedAt: ISODateTime;
}
export type Rsvp = RSVP;

/** Participant list row (only returned when the viewer may see participants). */
export interface Participant {
  person: PersonRef;
  chapterId: ID;
  status: RsvpStatus;
  respondedAt: ISODateTime;
}

export interface AttendanceRecord {
  id: ID;
  eventId: ID;
  userId: ID;
  status: AttendanceStatus;
  recordedBy: ID;
  recordedAt: ISODateTime;
}

/** Attendance sheet row: every eligible member with their RSVP and recorded attendance. */
export interface AttendanceEntry {
  person: PersonRef;
  chapterId: ID;
  rsvp: RsvpStatus | null;
  record: AttendanceRecord | null;
}

export interface AttendanceInput {
  userId: ID;
  status: AttendanceStatus;
}

export const EVENT_WHEN = ['upcoming', 'past', 'all'] as const;
export type EventWhen = (typeof EVENT_WHEN)[number];

export interface EventListQuery {
  when?: EventWhen;
  scope?: EventScope | 'all';
  /** Omit for all chapters. */
  chapterId?: ID;
  search?: string;
  category?: EventCategory | 'all';
  /** "YYYY-MM" (Europe/Sofia) — compact calendar view. */
  month?: string;
  /** Include draft/cancelled events the viewer may manage (management views). */
  includeUnpublished?: boolean;
  status?: EventStatus | 'all';
}

export interface EventInput {
  translations: Translations<EventTranslation>;
  scope: EventScope;
  chapterId: ID | null;
  category: EventCategory;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  location: EventLocation;
  capacity: number | null;
  registrationDeadline: ISODateTime | null;
  participantVisibility: ParticipantVisibility;
  imageUrl: string | null;
}

/** Create payload: `publish: true` publishes immediately when the subject may do so. */
export interface EventCreateInput extends EventInput {
  publish: boolean;
}

/** Mock "Add to calendar" export (.ics text; the UI turns it into a download). */
export interface CalendarExport {
  fileName: string;
  mimeType: 'text/calendar';
  content: string;
}
