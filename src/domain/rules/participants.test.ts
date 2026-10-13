import { describe, expect, it } from 'vitest';

import type { Event, ParticipantVisibility } from '@/domain';
import { personaSubject, subjectsByPersona } from '@/test/subjects';

import {
  isEventOrganizerView,
  participantAccess,
  visibleParticipantStatuses,
} from './participants';

const S = subjectsByPersona();
const NOW = new Date('2026-10-12T09:00:00.000Z');

type EventLike = Pick<
  Event,
  'status' | 'scope' | 'chapterId' | 'participantVisibility' | 'organizerId'
>;

const chapterEvent = (visibility: ParticipantVisibility, chapterId = 'ch-1'): EventLike => ({
  status: 'published',
  scope: 'chapter',
  chapterId,
  participantVisibility: visibility,
  organizerId: 'u-officer',
});

describe('participant visibility', () => {
  it('"members": everyone who can see the event sees going / maybe names', () => {
    const event = chapterEvent('members');
    expect(participantAccess(S.active_member, event, NOW)).toBe('list');
    expect(visibleParticipantStatuses(S.active_member, event, NOW)).toEqual(['going', 'maybe']);
  });

  it('"organizers": ordinary members see totals only', () => {
    const event = chapterEvent('organizers');
    expect(participantAccess(S.active_member, event, NOW)).toBe('totals_only');
    expect(visibleParticipantStatuses(S.active_member, event, NOW)).toEqual([]);
  });

  it('organizers always see every reply, including "not going"', () => {
    for (const visibility of ['members', 'organizers'] as const) {
      const event = chapterEvent(visibility);
      expect(participantAccess(S.chapter_secretary, event, NOW)).toBe('list');
      expect(isEventOrganizerView(S.chapter_secretary, event, NOW)).toBe(true);
      expect(visibleParticipantStatuses(S.chapter_chairman, event, NOW)).toEqual([
        'going',
        'maybe',
        'not_going',
      ]);
    }
  });

  it('national roles organise every chapter event', () => {
    const event = chapterEvent('organizers', 'ch-4');
    expect(participantAccess(S.national_coordinator, event, NOW)).toBe('list');
    expect(participantAccess(S.sysadmin, event, NOW)).toBe('list');
  });

  it('gives no access to events outside the subject’s scope or without a subject', () => {
    const otherChapter = chapterEvent('members', 'ch-4');
    expect(participantAccess(S.active_member, otherChapter, NOW)).toBe('none');
    expect(participantAccess(S.chapter_secretary, otherChapter, NOW)).toBe('none');
    expect(participantAccess(null, chapterEvent('members'), NOW)).toBe('none');
  });

  it('a chapter officer of another chapter sees only totals of a national event', () => {
    const national: EventLike = {
      status: 'published',
      scope: 'national',
      chapterId: null,
      participantVisibility: 'organizers',
      organizerId: 'u-national-officer',
    };
    const officer = personaSubject('chapter_secretary');
    expect(participantAccess(officer, national, NOW)).toBe('totals_only');
    expect(participantAccess(S.national_coordinator, national, NOW)).toBe('list');
  });
});
