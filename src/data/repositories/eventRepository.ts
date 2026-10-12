import type {
  AttendanceEntry,
  AttendanceInput,
  CalendarExport,
  EventCreateInput,
  EventInput,
  EventListQuery,
  EventNote,
  EventView,
  ID,
  Participant,
  ParticipantTotals,
  ParticipantVisibility,
  RSVP,
  RsvpStatus,
} from '@/domain';

/** Events, RSVPs, attendance and organizer notes. */
export interface EventRepository {
  /** GET /api/v1/events?when=upcoming|past&scope=&chapter_id=&search=&category=&month=&include_unpublished= */
  list(query?: EventListQuery): Promise<EventView[]>;

  /** GET /api/v1/events/{event_id} — @throws NotFoundError when not visible */
  get(eventId: ID): Promise<EventView>;

  /** POST /api/v1/events — draft, or published when `publish` and allowed. */
  create(input: EventCreateInput): Promise<EventView>;

  /** PUT /api/v1/events/{event_id} */
  update(eventId: ID, input: EventInput): Promise<EventView>;

  /** POST /api/v1/events/{event_id}/publish — draft → published */
  publish(eventId: ID): Promise<EventView>;

  /** POST /api/v1/events/{event_id}/cancel — published → cancelled (notifies RSVPs) */
  cancel(eventId: ID, reason: string): Promise<EventView>;

  /** PATCH /api/v1/events/{event_id} { participant_visibility } */
  setParticipantVisibility(eventId: ID, visibility: ParticipantVisibility): Promise<EventView>;

  /** PATCH /api/v1/events/{event_id} { capacity } — null = unlimited. @throws ValidationError below current going count */
  setCapacity(eventId: ID, capacity: number | null): Promise<EventView>;

  /**
   * PUT /api/v1/events/{event_id}/rsvp { status } — for the subject only.
   * @throws ConflictError('events.errors.full' | 'events.errors.deadlinePassed' …) per domain rules.
   */
  rsvp(eventId: ID, status: RsvpStatus): Promise<EventView>;

  /** GET /api/v1/events/{event_id}/rsvp — the subject's RSVP or null. */
  myRsvp(eventId: ID): Promise<RSVP | null>;

  /** GET /api/v1/events/{event_id}/participants — @throws ForbiddenError unless canViewParticipants */
  listParticipants(eventId: ID): Promise<Participant[]>;

  /** GET /api/v1/events/{event_id}/participants/totals — visible to anyone who can see the event. */
  participantTotals(eventId: ID): Promise<ParticipantTotals>;

  /** GET /api/v1/events/{event_id}/attendance — @throws ForbiddenError unless attendance.read in scope */
  listAttendance(eventId: ID): Promise<AttendanceEntry[]>;

  /** PUT /api/v1/events/{event_id}/attendance [{ user_id, status }] — bulk upsert (attendance.manage). */
  recordAttendance(eventId: ID, records: AttendanceInput[]): Promise<AttendanceEntry[]>;

  /** POST /api/v1/events/{event_id}/notes — organizer note. */
  addNote(eventId: ID, body: string): Promise<EventNote>;

  /** GET /api/v1/events/{event_id}/calendar.ics — mock .ics text for "Add to calendar". */
  exportCalendar(eventId: ID): Promise<CalendarExport>;
}
