import type { Event, ID, ISODateTime, ParticipantTotals, RSVP, RsvpStatus } from '@/domain';

/**
 * Pure event rules: timing, registration, capacity and RSVP decisions.
 * Shared by the mock backend (server-side enforcement) and the UI (to explain disabled actions).
 * Every function takes `now` explicitly so results are deterministic and testable.
 */

type Timing = Pick<Event, 'startsAt' | 'endsAt' | 'registrationDeadline'>;

const ms = (iso: ISODateTime): number => Date.parse(iso);

/** The event has started (RSVPs and edits to replies are closed from this moment). */
export function hasEventStarted(event: Pick<Event, 'startsAt'>, now: Date): boolean {
  return ms(event.startsAt) <= now.getTime();
}

/** The event is over (moves to the "Past" tab). */
export function hasEventEnded(event: Pick<Event, 'endsAt'>, now: Date): boolean {
  return ms(event.endsAt) <= now.getTime();
}

/** Upcoming = not finished yet (an event in progress is still "upcoming"). */
export function isUpcomingEvent(event: Pick<Event, 'endsAt'>, now: Date): boolean {
  return !hasEventEnded(event, now);
}

/** When replies close: the registration deadline, or the start time when there is none. */
export function registrationClosesAt(event: Timing): ISODateTime {
  if (event.registrationDeadline && ms(event.registrationDeadline) < ms(event.startsAt)) {
    return event.registrationDeadline;
  }
  return event.startsAt;
}

export function isRegistrationOpen(event: Timing, now: Date): boolean {
  return now.getTime() < ms(registrationClosesAt(event));
}

/** Window in which an explicit registration deadline is flagged (Beacon in the design system). */
export const DEADLINE_SOON_HOURS = 72;
/** Window in which an upcoming event is flagged as time-critical (Ruby in the design system). */
export const STARTING_SOON_HOURS = 24;

const HOUR_MS = 3_600_000;

/**
 * Registration is still open but an explicit deadline (one before the start) closes it within
 * `withinHours`. Events without a deadline close at the start and are covered by isStartingSoon.
 */
export function isRegistrationClosingSoon(
  event: Timing,
  now: Date,
  withinHours: number = DEADLINE_SOON_HOURS,
): boolean {
  const closesAt = registrationClosesAt(event);
  if (closesAt === event.startsAt || !isRegistrationOpen(event, now)) return false;
  return ms(closesAt) - now.getTime() <= withinHours * HOUR_MS;
}

/** Not started yet and starting within `withinHours`. */
export function isStartingSoon(
  event: Pick<Event, 'startsAt'>,
  now: Date,
  withinHours: number = STARTING_SOON_HOURS,
): boolean {
  const untilStart = ms(event.startsAt) - now.getTime();
  return untilStart > 0 && untilStart <= withinHours * HOUR_MS;
}

/** Number of "going" replies, optionally ignoring one user (their own reply when they change it). */
export function countGoing(
  rsvps: ReadonlyArray<Pick<RSVP, 'userId' | 'status'>>,
  excludeUserId?: ID,
): number {
  return rsvps.filter((r) => r.status === 'going' && r.userId !== excludeUserId).length;
}

/** Places left (null = unlimited). Never negative. */
export function remainingSeats(capacity: number | null, going: number): number | null {
  return capacity === null ? null : Math.max(0, capacity - going);
}

export function computeParticipantTotals(
  capacity: number | null,
  rsvps: ReadonlyArray<Pick<RSVP, 'status'>>,
): ParticipantTotals {
  const going = rsvps.filter((r) => r.status === 'going').length;
  const spotsLeft = remainingSeats(capacity, going);
  return {
    going,
    maybe: rsvps.filter((r) => r.status === 'maybe').length,
    notGoing: rsvps.filter((r) => r.status === 'not_going').length,
    capacity,
    spotsLeft,
    isFull: spotsLeft === 0,
  };
}

// -------------------------------------------------------------------------------------------------
// RSVP
// -------------------------------------------------------------------------------------------------

/** Why an RSVP is rejected. Dotted codes; map to UI text with RSVP_REJECTION_MESSAGE_KEYS. */
export const RSVP_REJECTION_REASONS = [
  'rsvp.not_self',
  'event.not_published',
  'event.cancelled',
  'event.past',
  'event.deadline_passed',
  'event.full',
] as const;
export type RsvpRejectionReason = (typeof RSVP_REJECTION_REASONS)[number];

/** i18n keys (fragment `messages`) explaining each rejection — also the ConflictError reasonKey. */
export const RSVP_REJECTION_MESSAGE_KEYS: Record<RsvpRejectionReason, string> = {
  'rsvp.not_self': 'messages.errors.rsvpNotSelf',
  'event.not_published': 'messages.errors.eventNotPublished',
  'event.cancelled': 'messages.errors.eventCancelled',
  'event.past': 'messages.errors.eventPast',
  'event.deadline_passed': 'messages.errors.registrationClosed',
  'event.full': 'messages.errors.eventFull',
};

export type RsvpDecision = { allowed: true } | { allowed: false; reason: RsvpRejectionReason };

export interface RsvpContext {
  event: Pick<Event, 'status' | 'startsAt' | 'endsAt' | 'registrationDeadline' | 'capacity'>;
  /** Who is acting. Members may only reply for themselves. */
  actorUserId: ID;
  /** Whose reply is being set. */
  targetUserId: ID;
  /** Every current reply for the event (including the target's own). */
  rsvps: ReadonlyArray<Pick<RSVP, 'userId' | 'status'>>;
  now: Date;
}

const ALLOWED: RsvpDecision = { allowed: true };
const reject = (reason: RsvpRejectionReason): RsvpDecision => ({ allowed: false, reason });

/**
 * Decides whether `requested` may be recorded:
 *  - only for yourself; only on published, not-cancelled events that have not started;
 *  - only before the registration deadline;
 *  - "going" needs a free place — the requester's own current "going" does not count against
 *    them, so switching going → maybe frees a place and re-confirming "going" is always fine;
 *  - "maybe" / "not going" are allowed even when the event is full.
 */
export function evaluateRsvp(context: RsvpContext, requested: RsvpStatus): RsvpDecision {
  const { event, actorUserId, targetUserId, rsvps, now } = context;
  if (actorUserId !== targetUserId) return reject('rsvp.not_self');
  return decideOwnRsvp(
    {
      event,
      current: rsvps.find((r) => r.userId === targetUserId)?.status ?? null,
      othersGoing: countGoing(rsvps, targetUserId),
      now,
    },
    requested,
  );
}

/** A member's own reply, from counts rather than the full reply list (what the UI has). */
export interface OwnRsvpContext {
  event: RsvpContext['event'];
  /** The member's current reply. */
  current: RsvpStatus | null;
  /** "Going" replies from everyone else. */
  othersGoing: number;
  now: Date;
}

function decideOwnRsvp(context: OwnRsvpContext, requested: RsvpStatus): RsvpDecision {
  const { event, current, othersGoing, now } = context;
  if (event.status === 'draft') return reject('event.not_published');
  if (event.status === 'cancelled') return reject('event.cancelled');
  if (hasEventStarted(event, now)) return reject('event.past');
  if (!isRegistrationOpen(event, now)) return reject('event.deadline_passed');
  if (requested === 'going' && current !== 'going') {
    if (event.capacity !== null && othersGoing >= event.capacity) return reject('event.full');
  }
  return ALLOWED;
}

/** Decision for every reply option of the signed-in member (event detail page). */
export function ownRsvpOptions(context: OwnRsvpContext): Record<RsvpStatus, RsvpDecision> {
  return {
    going: decideOwnRsvp(context, 'going'),
    maybe: decideOwnRsvp(context, 'maybe'),
    not_going: decideOwnRsvp(context, 'not_going'),
  };
}

/** Decision for every reply option (UI: enable/disable the segmented control with a reason). */
export function rsvpOptions(context: RsvpContext): Record<RsvpStatus, RsvpDecision> {
  return {
    going: evaluateRsvp(context, 'going'),
    maybe: evaluateRsvp(context, 'maybe'),
    not_going: evaluateRsvp(context, 'not_going'),
  };
}

/** Attendance can be recorded once the event has started (and it was not cancelled). */
export function canRecordAttendanceAt(
  event: Pick<Event, 'status' | 'startsAt'>,
  now: Date,
): boolean {
  return event.status === 'published' && hasEventStarted(event, now);
}
