import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { EventCreateInput } from '@/domain';
import { clock } from '@/lib/clock';

import { SEED_IDS } from '../seed';
import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockEventRepository } from './eventRepository';

const events = createMockEventRepository();
const E = SEED_IDS.events;

function inDays(days: number, hours = 15): string {
  const d = new Date(clock.now().getTime() + days * 86_400_000);
  d.setUTCHours(hours, 0, 0, 0);
  return d.toISOString();
}

const newEvent = (overrides: Partial<EventCreateInput> = {}): EventCreateInput => ({
  translations: {
    en: {
      title: 'Board games night',
      summary: 'Games, snacks and good company.',
      description: 'Bring your favourite game.\n\nWe finish by 21:00.',
    },
    bg: {
      title: 'Вечер на настолните игри',
      summary: 'Игри, почерпка и добра компания.',
      description: 'Донесете любимата си игра.\n\nПриключваме до 21:00 ч.',
    },
  },
  scope: 'chapter',
  chapterId: 'ch-1',
  category: 'social',
  startsAt: inDays(9),
  endsAt: inDays(9, 18),
  location: {
    name: { en: 'Chapter hall', bg: 'Залата на обителта' },
    address: { en: '1 Demo Street, Sofia', bg: 'ул. „Демо“ 1, София' },
    online: false,
    url: null,
  },
  capacity: 20,
  registrationDeadline: inDays(8),
  participantVisibility: 'members',
  imageUrl: null,
  publish: true,
  ...overrides,
});

const conflictKey = async (promise: Promise<unknown>) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ConflictError);
  return (error as ConflictError).reasonKey;
};

describe('event repository — visibility', () => {
  it('member sees published national + own chapter events, never drafts or other chapters', async () => {
    signInAs('member');
    const upcoming = await events.list({ when: 'upcoming' });
    const ids = upcoming.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining([E.memberCanRsvp, E.nationalConference, E.full]));
    expect(ids).not.toContain(E.draft);
    expect(ids).not.toContain('ev-ch2-football');
    expect(upcoming.every((e) => e.notes.length === 0)).toBe(true);
    expect([...upcoming].sort((a, b) => a.startsAt.localeCompare(b.startsAt))).toEqual(upcoming);
    const past = await events.list({ when: 'past' });
    expect(past.map((e) => e.id)).toContain(E.pastWithAttendance);
    await expect(events.get(E.draft)).rejects.toBeInstanceOf(NotFoundError);
    await expect(events.get('ev-ch2-football')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('organizers see drafts and notes in management views', async () => {
    signInAs('chapter_officer');
    const managed = await events.list({ when: 'all', includeUnpublished: true });
    expect(managed.map((e) => e.id)).toContain(E.draft);
    expect(managed.some((e) => e.notes.length > 0)).toBe(true);
  });

  it('filters by scope, category, month and search', async () => {
    signInAs('member');
    const national = await events.list({ when: 'all', scope: 'national' });
    expect(national.every((e) => e.scope === 'national')).toBe(true);
    const ceremonies = await events.list({ when: 'all', category: 'ceremony' });
    expect(ceremonies.every((e) => e.category === 'ceremony')).toBe(true);
    const found = await events.list({ when: 'all', search: 'боулинг' });
    expect(found.map((e) => e.id)).toContain(E.full);
  });
});

describe('event repository — RSVP rules enforced server-side', () => {
  it('member replies to an open event; totals and myRsvp update', async () => {
    signInAs('member');
    const before = await events.participantTotals(E.memberCanRsvp);
    const view = await events.rsvp(E.memberCanRsvp, 'going');
    expect(view.myRsvp).toBe('going');
    expect(view.totals.going).toBe(before.going + 1);
    expect(await events.myRsvp(E.memberCanRsvp)).toMatchObject({
      userId: 'u-member',
      status: 'going',
    });
  });

  it('full event: "going" is rejected with event.full; maybe is accepted', async () => {
    signInAs('member');
    expect(await conflictKey(events.rsvp(E.full, 'going'))).toBe('messages.errors.eventFull');
    expect((await events.rsvp(E.full, 'maybe')).myRsvp).toBe('maybe');
  });

  it('rejects replies after the deadline, to cancelled events and to past events', async () => {
    signInAs('member');
    expect(await conflictKey(events.rsvp(E.deadlinePassed, 'going'))).toBe(
      'messages.errors.registrationClosed',
    );
    expect(await conflictKey(events.rsvp(E.cancelled, 'maybe'))).toBe(
      'messages.errors.eventCancelled',
    );
    expect(await conflictKey(events.rsvp(E.pastWithAttendance, 'not_going'))).toBe(
      'messages.errors.eventPast',
    );
  });

  it('switching from going frees a seat for someone else', async () => {
    signInAs('member');
    expect(await conflictKey(events.rsvp(E.full, 'going'))).toBe('messages.errors.eventFull');
    const holder = db.find('rsvps', (r) => r.eventId === E.full && r.status === 'going')[0];
    expect(holder).toBeDefined();
    db.update('rsvps', holder?.id ?? '', { status: 'maybe' });
    expect((await events.rsvp(E.full, 'going')).myRsvp).toBe('going');
    expect((await events.participantTotals(E.full)).isFull).toBe(true);
  });

  it('rejects an invalid status value', async () => {
    signInAs('member');
    await expect(events.rsvp(E.memberCanRsvp, 'yes' as unknown as 'going')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('event repository — organizer commands', () => {
  it('officer creates and publishes a chapter event → audit + chapter notified', async () => {
    signInAs('chapter_officer');
    const view = await events.create(newEvent());
    expect(view).toMatchObject({
      status: 'published',
      organizerId: 'u-officer',
      chapterId: 'ch-1',
    });
    expect(auditEntries('event.created', view.id)).toHaveLength(1);
    expect(auditEntries('event.published', view.id)).toHaveLength(1);
    expect(notificationsOf('u-member')[0]).toMatchObject({
      category: 'events',
      link: { to: `/events/${view.id}`, entityType: 'event', entityId: view.id },
    });
    expect(notificationsOf('u-p01').some((n) => n.link?.entityId === view.id)).toBe(false);
  });

  it('drafts can be incomplete but cannot be published until EN and BG are complete', async () => {
    signInAs('chapter_officer');
    const draft = await events.create(
      newEvent({ publish: false, translations: { en: newEvent().translations.en } }),
    );
    expect(draft.status).toBe('draft');
    const error = await events.publish(draft.id).catch((e: unknown) => e);
    expect((error as ValidationError).fieldErrors).toEqual({
      'translations.bg.title': 'validation.translationMissingBg',
    });
  });

  it('members cannot create; officers cannot create national events or cancel', async () => {
    signInAs('member');
    await expect(events.create(newEvent())).rejects.toBeInstanceOf(ForbiddenError);
    signInAs('chapter_officer');
    await expect(
      events.create(newEvent({ scope: 'national', chapterId: null })),
    ).rejects.toMatchObject({ permission: 'event.create' });
    await expect(events.cancel(E.memberGoing, 'Rain')).rejects.toMatchObject({
      permission: 'event.cancel',
    });
  });

  it('advisor cancels → people who replied going/maybe are notified', async () => {
    signInAs('chapter_advisor');
    const before = notificationsOf('u-member').length;
    const view = await events.cancel(E.memberGoing, 'The hall is unavailable.');
    expect(view).toMatchObject({
      status: 'cancelled',
      cancelledReason: 'The hall is unavailable.',
    });
    expect(notificationsOf('u-member')).toHaveLength(before + 1);
    expect(notificationsOf('u-member')[0]?.title).toMatchObject({
      key: 'messages.notifications.eventCancelled.title',
    });
    expect(auditEntries('event.cancelled', E.memberGoing)).toHaveLength(1);
    await expect(events.cancel(E.memberGoing, 'again')).rejects.toMatchObject({
      reason: 'invalid_transition',
    });
  });

  it('updates notify interested members and audit capacity/visibility changes', async () => {
    signInAs('chapter_officer');
    const current = await events.get(E.memberGoing);
    const before = notificationsOf('u-member').length;
    await events.update(E.memberGoing, {
      translations: current.translations,
      scope: current.scope,
      chapterId: current.chapterId,
      category: current.category,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      location: current.location,
      capacity: 30,
      registrationDeadline: current.registrationDeadline,
      participantVisibility: 'organizers',
      imageUrl: current.imageUrl,
    });
    expect(notificationsOf('u-member')).toHaveLength(before + 1);
    expect(auditEntries('event.updated', E.memberGoing)).toHaveLength(1);
    expect(auditEntries('event.capacity_changed', E.memberGoing)).toHaveLength(1);
    expect(auditEntries('event.visibility_changed', E.memberGoing)).toHaveLength(1);
  });

  it('capacity can never drop below the number of members going', async () => {
    signInAs('chapter_officer');
    const error = await events.setCapacity(E.almostFull, 5).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors.capacity).toBe(
      'messages.validation.capacityBelowGoing|{"count":10}',
    );
    const view = await events.setCapacity(E.almostFull, 14);
    expect(view.totals).toMatchObject({ capacity: 14, spotsLeft: 4 });
    expect(auditEntries('event.capacity_changed', E.almostFull)).toHaveLength(1);
    expect((await events.setCapacity(E.almostFull, null)).totals.spotsLeft).toBeNull();
  });

  it('participant visibility setting is enforced', async () => {
    signInAs('member');
    await expect(events.listParticipants(E.almostFull)).rejects.toMatchObject({
      permission: 'event.participants.read',
    });
    const list = await events.listParticipants(E.memberGoing);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => p.status !== 'not_going')).toBe(true);
    expect(Object.keys(list[0]?.person ?? {}).sort()).toEqual(['avatarUrl', 'displayName', 'id']);
    signInAs('chapter_officer');
    const organizerView = await events.listParticipants(E.almostFull);
    expect(organizerView.filter((p) => p.status === 'going')).toHaveLength(10);
    const auditBefore = auditEntries('event.visibility_changed', E.almostFull).length;
    const view = await events.setParticipantVisibility(E.almostFull, 'members');
    expect(view.participantVisibility).toBe('members');
    const audit = auditEntries('event.visibility_changed', E.almostFull);
    expect(audit).toHaveLength(auditBefore + 1);
    expect(audit[0]?.actorId).toBe('u-officer');
  });

  it('attendance: recorded only after the start, by organizers, and audited', async () => {
    signInAs('member');
    await expect(events.listAttendance(E.pastWithoutAttendance)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    signInAs('chapter_officer');
    const sheet = await events.listAttendance(E.pastWithoutAttendance);
    expect(sheet.length).toBeGreaterThan(5);
    expect(sheet.every((row) => row.record === null)).toBe(true);
    const updated = await events.recordAttendance(E.pastWithoutAttendance, [
      { userId: 'u-member', status: 'present' },
      { userId: 'u-s05', status: 'excused' },
    ]);
    expect(updated.find((r) => r.person.id === 'u-member')?.record).toMatchObject({
      status: 'present',
      recordedBy: 'u-officer',
    });
    expect(auditEntries('attendance.recorded', E.pastWithoutAttendance)[0]?.metadata).toMatchObject(
      {
        count: 2,
        present: 1,
      },
    );
    expect(
      await conflictKey(
        events.recordAttendance(E.memberCanRsvp, [{ userId: 'u-member', status: 'present' }]),
      ),
    ).toBe('messages.errors.attendanceNotStarted');
    await expect(
      events.recordAttendance(E.pastWithoutAttendance, [{ userId: 'u-p01', status: 'present' }]),
    ).rejects.toMatchObject({ formErrorKey: 'messages.errors.attendanceNotEligible' });
  });

  it('organizer notes are private to managers', async () => {
    signInAs('chapter_officer');
    const note = await events.addNote(E.memberCanRsvp, 'Order the certificates.');
    expect(note).toMatchObject({ authorId: 'u-officer', body: 'Order the certificates.' });
    expect((await events.get(E.memberCanRsvp)).notes.map((n) => n.id)).toContain(note.id);
    signInAs('member');
    expect((await events.get(E.memberCanRsvp)).notes).toEqual([]);
    await expect(events.addNote(E.memberCanRsvp, 'hi')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('exports an .ics file for visible events', async () => {
    signInAs('member');
    const ics = await events.exportCalendar(E.nationalConference);
    expect(ics.mimeType).toBe('text/calendar');
    expect(ics.fileName).toBe(`demolay-${E.nationalConference}.ics`);
    expect(ics.content).toContain('BEGIN:VCALENDAR');
    expect(ics.content).toMatch(/SUMMARY:.+/);
    expect(ics.content).toContain('END:VCALENDAR');
  });
});
