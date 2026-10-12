import { canViewEventNotes, canViewMemberPrivateFields } from '@/auth/policy';
import { assignmentFor, db, type MemberRecord } from '@/data/store';
import { computeParticipantTotals } from '@/domain/rules/events';
import { toDirectoryEntry } from '@/domain/rules/directory';
import type {
  Announcement,
  AnnouncementView,
  CurrentMember,
  DirectoryEntry,
  Event,
  EventView,
  ID,
  MemberDetail,
  MemberProfile,
  MemberSummary,
  ParticipantTotals,
  Resource,
  ResourceView,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';

import { chapterName, personRef } from '../helpers';

import { isLeaderFor } from './subjects';

/** DTO projections shared by the mock repositories (the "response models" of the API). */

export function toAnnouncementView(post: Announcement, subject: Subject): AnnouncementView {
  return {
    ...post,
    author: personRef(post.authorId),
    reviewer: post.reviewerId ? personRef(post.reviewerId) : null,
    chapterName: chapterName(post.chapterId),
    isRead: !!db.get('announcementReads', `${post.id}:${subject.userId}`),
  };
}

export function totalsForEvent(event: Pick<Event, 'id' | 'capacity'>): ParticipantTotals {
  return computeParticipantTotals(
    event.capacity,
    db.find('rsvps', (r) => r.eventId === event.id),
  );
}

export function toEventView(event: Event, subject: Subject, now: Date = clock.now()): EventView {
  return {
    ...event,
    notes: canViewEventNotes(subject, event, now) ? event.notes : [],
    organizer: personRef(event.organizerId),
    chapterName: chapterName(event.chapterId),
    myRsvp: db.get('rsvps', `${event.id}:${subject.userId}`)?.status ?? null,
    totals: totalsForEvent(event),
  };
}

export function toResourceView(resource: Resource): ResourceView {
  return {
    ...resource,
    uploader: personRef(resource.uploadedBy),
    chapterName: chapterName(resource.chapterId),
  };
}

/** Public profile (restricted fields removed). */
export function toMemberProfile(record: MemberRecord): MemberProfile {
  return {
    userId: record.userId,
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    chapterId: record.chapterId,
    importedPosition: record.importedPosition,
    joinedAt: record.joinedAt,
    bio: record.bio,
    notificationPreferences: record.notificationPreferences,
    privacy: record.privacy,
  };
}

export function toCurrentMember(record: MemberRecord): CurrentMember {
  return {
    ...toMemberProfile(record),
    account: db.require('users', record.userId, 'user'),
    private: { ...record.private },
  };
}

/** Staff roster row — never contains contact data. */
export function toMemberSummary(record: MemberRecord): MemberSummary {
  const user = db.require('users', record.userId, 'user');
  const assignment = assignmentFor(record.userId);
  return {
    userId: record.userId,
    username: user.username,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    chapterId: record.chapterId,
    status: user.status,
    role: assignment.role,
    scope: assignment.scope,
    importedPosition: record.importedPosition,
    joinedAt: record.joinedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/** Staff detail; `private` only when the viewer may see restricted fields. */
export function toMemberDetail(
  record: MemberRecord,
  subject: Subject,
  now: Date = clock.now(),
): MemberDetail {
  const assignment = db.get('roleAssignments', `ra-${record.userId}`) ?? assignmentFor(record.userId);
  return {
    ...toMemberProfile(record),
    account: db.require('users', record.userId, 'user'),
    roleAssignment: assignment,
    specialAssignments: db
      .find('specialAssignments', (sa) => sa.userId === record.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    private: canViewMemberPrivateFields(subject, record, now) ? { ...record.private } : null,
  };
}

/** Privacy-safe directory entry for `viewerId` (leadership computed from permissions). */
export function directoryEntryFor(
  record: MemberRecord,
  viewerId: ID,
  chapterId: ID,
  now: Date = clock.now(),
): DirectoryEntry {
  return toDirectoryEntry(record, {
    viewerUserId: viewerId,
    isLeader: isLeaderFor(record.userId, chapterId, now),
  });
}
