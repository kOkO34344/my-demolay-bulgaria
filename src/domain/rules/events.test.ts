import { describe, expect, it } from 'vitest';

import type { Event, RSVP, RsvpStatus } from '@/domain';

import {
  RSVP_REJECTION_MESSAGE_KEYS,
  RSVP_REJECTION_REASONS,
  canRecordAttendanceAt,
  computeParticipantTotals,
  countGoing,
  evaluateRsvp,
  hasEventEnded,
  hasEventStarted,
  isRegistrationOpen,
  isUpcomingEvent,
  registrationClosesAt,
  remainingSeats,
  rsvpOptions,
  type RsvpContext,
} from './events';

const NOW = new Date('2026-10-12T09:00:00.000Z');
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

type EventFields = RsvpContext['event'];

function event(overrides: Partial<EventFields> = {}): EventFields {
  return {
    status: 'published',
    startsAt: inDays(5),
    endsAt: inDays(5.1),
    registrationDeadline: null,
    capacity: null,
    ...overrides,
  };
}

const reply = (userId: string, status: RsvpStatus): Pick<RSVP, 'userId' | 'status'> => ({
  userId,
  status,
});

function context(overrides: Partial<RsvpContext> & { event?: EventFields } = {}): RsvpContext {
  return {
    event: event(),
    actorUserId: 'u-member',
    targetUserId: 'u-member',
    rsvps: [],
    now: NOW,
    ...overrides,
  };
}

describe('event timing', () => {
  it('distinguishes started, ended and upcoming events', () => {
    const running = { startsAt: inDays(-0.1), endsAt: inDays(0.1) };
    expect(hasEventStarted(running, NOW)).toBe(true);
    expect(hasEventEnded(running, NOW)).toBe(false);
    expect(isUpcomingEvent(running, NOW)).toBe(true);
    const past = { startsAt: inDays(-3), endsAt: inDays(-2.9) };
    expect(hasEventEnded(past, NOW)).toBe(true);
    expect(isUpcomingEvent(past, NOW)).toBe(false);
  });

  it('closes registration at the deadline, or at the start when there is none', () => {
    const withDeadline = event({ registrationDeadline: inDays(2) });
    expect(registrationClosesAt(withDeadline)).toBe(inDays(2));
    expect(isRegistrationOpen(withDeadline, NOW)).toBe(true);
    expect(isRegistrationOpen(withDeadline, new Date(inDays(3)))).toBe(false);
    expect(registrationClosesAt(event())).toBe(inDays(5));
    // A deadline after the start is ignored (the start closes registration).
    expect(registrationClosesAt(event({ registrationDeadline: inDays(9) }))).toBe(inDays(5));
  });
});

describe('capacity and remaining seats', () => {
  it('counts places and never goes negative', () => {
    expect(remainingSeats(null, 40)).toBeNull();
    expect(remainingSeats(10, 4)).toBe(6);
    expect(remainingSeats(3, 5)).toBe(0);
  });

  it('counts going replies, optionally ignoring one member', () => {
    const rsvps = [reply('a', 'going'), reply('b', 'going'), reply('c', 'maybe')];
    expect(countGoing(rsvps)).toBe(2);
    expect(countGoing(rsvps, 'a')).toBe(1);
  });

  it('computes totals with spots left and the full flag', () => {
    const rsvps = [reply('a', 'going'), reply('b', 'going'), reply('c', 'maybe')];
    expect(computeParticipantTotals(2, [...rsvps, reply('d', 'not_going')])).toEqual({
      going: 2,
      maybe: 1,
      notGoing: 1,
      capacity: 2,
      spotsLeft: 0,
      isFull: true,
    });
    expect(computeParticipantTotals(null, rsvps)).toMatchObject({ spotsLeft: null, isFull: false });
    expect(computeParticipantTotals(5, rsvps)).toMatchObject({ spotsLeft: 3, isFull: false });
  });
});

describe('evaluateRsvp', () => {
  it('accepts every reply on an open published event', () => {
    expect(rsvpOptions(context())).toEqual({
      going: { allowed: true },
      maybe: { allowed: true },
      not_going: { allowed: true },
    });
  });

  it('only lets members reply for themselves', () => {
    expect(evaluateRsvp(context({ targetUserId: 'u-officer' }), 'going')).toEqual({
      allowed: false,
      reason: 'rsvp.not_self',
    });
  });

  it.each<[Event['status'], string]>([
    ['draft', 'event.not_published'],
    ['cancelled', 'event.cancelled'],
  ])('rejects replies to %s events', (status, reason) => {
    expect(evaluateRsvp(context({ event: event({ status }) }), 'maybe')).toEqual({
      allowed: false,
      reason,
    });
  });

  it('makes started and past events read-only', () => {
    const past = event({ startsAt: inDays(-2), endsAt: inDays(-1.9) });
    expect(evaluateRsvp(context({ event: past }), 'not_going')).toMatchObject({
      reason: 'event.past',
    });
    const running = event({ startsAt: inDays(-0.01), endsAt: inDays(0.2) });
    expect(evaluateRsvp(context({ event: running }), 'going')).toMatchObject({
      reason: 'event.past',
    });
  });

  it('rejects every reply once the registration deadline has passed', () => {
    const closed = event({ registrationDeadline: inDays(-1) });
    for (const status of ['going', 'maybe', 'not_going'] as const) {
      expect(evaluateRsvp(context({ event: closed }), status)).toEqual({
        allowed: false,
        reason: 'event.deadline_passed',
      });
    }
  });

  it('rejects "going" when the event is full but still allows maybe / not going', () => {
    const full = context({
      event: event({ capacity: 2 }),
      rsvps: [reply('a', 'going'), reply('b', 'going')],
    });
    expect(evaluateRsvp(full, 'going')).toEqual({ allowed: false, reason: 'event.full' });
    expect(evaluateRsvp(full, 'maybe')).toEqual({ allowed: true });
    expect(evaluateRsvp(full, 'not_going')).toEqual({ allowed: true });
  });

  it('lets a member who already holds a place confirm it again when full', () => {
    const full = context({
      event: event({ capacity: 2 }),
      rsvps: [reply('u-member', 'going'), reply('b', 'going')],
    });
    expect(evaluateRsvp(full, 'going')).toEqual({ allowed: true });
  });

  it('frees a seat when someone switches from going to maybe', () => {
    const base = { event: event({ capacity: 2 }), targetUserId: 'c', actorUserId: 'c' };
    const before = context({ ...base, rsvps: [reply('a', 'going'), reply('b', 'going')] });
    expect(evaluateRsvp(before, 'going')).toMatchObject({ reason: 'event.full' });
    const after = context({ ...base, rsvps: [reply('a', 'maybe'), reply('b', 'going')] });
    expect(evaluateRsvp(after, 'going')).toEqual({ allowed: true });
  });

  it('maps every rejection reason to a messages.errors key', () => {
    for (const reason of RSVP_REJECTION_REASONS) {
      expect(RSVP_REJECTION_MESSAGE_KEYS[reason]).toMatch(/^messages\.errors\./);
    }
  });
});

describe('canRecordAttendanceAt', () => {
  it('requires a published event that has started', () => {
    expect(canRecordAttendanceAt({ status: 'published', startsAt: inDays(-1) }, NOW)).toBe(true);
    expect(canRecordAttendanceAt({ status: 'published', startsAt: inDays(1) }, NOW)).toBe(false);
    expect(canRecordAttendanceAt({ status: 'cancelled', startsAt: inDays(-1) }, NOW)).toBe(false);
  });
});
