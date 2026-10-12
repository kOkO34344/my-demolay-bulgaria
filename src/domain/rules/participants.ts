import { can, canViewEvent, canViewParticipants, eventTarget } from '@/auth/policy';
import type { Event, RsvpStatus, Subject } from '@/domain';

/**
 * Participant visibility (event setting `participantVisibility`):
 *  - 'organizers': only holders of event.participants.read for the event's scope see names;
 *    everyone else who can see the event sees totals only.
 *  - 'members': anyone who can see the event also sees who is going / may come. Organizers
 *    additionally see "not going" replies.
 * Totals (going / maybe / not going) are always visible to anyone who can see the event.
 */

export type ParticipantAccess = 'list' | 'totals_only' | 'none';

type EventLike = Pick<
  Event,
  'status' | 'scope' | 'chapterId' | 'participantVisibility' | 'organizerId'
>;

export function participantAccess(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date,
): ParticipantAccess {
  if (!subject || !canViewEvent(subject, event, now)) return 'none';
  return canViewParticipants(subject, event, now) ? 'list' : 'totals_only';
}

/** Organizer-level access (sees every reply, including "not going"). */
export function isEventOrganizerView(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date,
): boolean {
  return can(subject, 'event.participants.read', eventTarget(event), now);
}

/** Reply statuses whose people the subject may see in the participant list. */
export function visibleParticipantStatuses(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date,
): RsvpStatus[] {
  const access = participantAccess(subject, event, now);
  if (access !== 'list') return [];
  return isEventOrganizerView(subject, event, now)
    ? ['going', 'maybe', 'not_going']
    : ['going', 'maybe'];
}
