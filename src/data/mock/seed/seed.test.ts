import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { canViewAnnouncement, canViewEvent, canViewResource } from '@/auth/policy';
import { buildSubject } from '@/auth/subject';
import {
  db,
  getSessionRecord,
  resetDemoData,
  type CollectionName,
  type DatabaseState,
} from '@/data/store';
import { specialAssignmentState } from '@/auth/policy';
import { incompleteLocales } from '@/domain/rules/translations';
import {
  EVENT_CATEGORIES,
  NOTIFICATION_CATEGORIES,
  RESOURCE_CATEGORIES,
  type EntityType,
  type LocalizedMessage,
  type Subject,
} from '@/domain';
import { i18n } from '@/i18n';
import { ROUTE_PATTERNS } from '@/lib/routes';
import { STORAGE_KEYS } from '@/lib/storage';

import { createMockPostRepository } from '../repositories/postRepository';
import { signInAs } from '../testing';

import { SEED_IDS, buildSeedState } from '.';

const NOW = new Date('2026-10-12T09:00:00.000Z');
const DEMO_USERS = ['u-member', 'u-officer', 'u-advisor', 'u-national-officer', 'u-admin'];

/** Every in-app route (core paths + the shell's attendance page). */
const ROUTES = [
  ...Object.values(ROUTE_PATTERNS).map((path) => ({ path })),
  { path: '/events/:eventId/attendance' },
];

const COLLECTION_FOR: Partial<Record<EntityType, CollectionName>> = {
  announcement: 'announcements',
  event: 'events',
  resource: 'resources',
  member: 'members',
  user: 'users',
  chapter: 'chapters',
  role_assignment: 'roleAssignments',
  special_assignment: 'specialAssignments',
  position_mapping: 'positionMappings',
  sync_job: 'syncJobs',
  sync_exception: 'syncExceptions',
  message: 'messages',
};

const values = <T>(record: Record<string, T>): T[] => Object.values(record);

function subjectIn(state: DatabaseState, userId: string): Subject {
  const { collections } = state;
  const member = collections.members[userId];
  const assignment = collections.roleAssignments[`ra-${userId}`];
  if (!member || !assignment) throw new Error(`no subject for ${userId}`);
  return buildSubject({
    assignment,
    homeChapterId: member.chapterId,
    specialAssignments: values(collections.specialAssignments).filter((s) => s.userId === userId),
    demoOverride: null,
    demoModeEnabled: false,
  });
}

function messageKeyExists(message: LocalizedMessage): boolean {
  if (message.kind === 'text') return message.text.en.length > 0 && message.text.bg.length > 0;
  const count = message.params?.count;
  const options = typeof count === 'number' ? { count } : {};
  return (
    i18n.exists(message.key, { ...options, lng: 'en' }) &&
    i18n.exists(message.key, { ...options, lng: 'bg' })
  );
}

describe('seed data', () => {
  const state = buildSeedState(NOW);
  const c = state.collections;

  it('is deterministic for a given seed time', () => {
    expect(buildSeedState(NOW)).toEqual(state);
  });

  it('meets the documented minimums', () => {
    expect(values(c.chapters)).toHaveLength(5);
    expect(values(c.members).length).toBeGreaterThanOrEqual(26);
    expect(values(c.users).filter((u) => u.status === 'suspended').length).toBeGreaterThanOrEqual(
      2,
    );
    expect(values(c.users).some((u) => u.status === 'pending')).toBe(true);
    expect(
      values(c.roleAssignments).filter((a) => a.source === 'manual').length,
    ).toBeGreaterThanOrEqual(2);
    for (const id of [
      'map-ch-standard-bearer',
      'map-ch-scribe',
      'map-ch-advisor',
      'map-nat-programme-coordinator',
    ]) {
      expect(c.positionMappings[id]).toBeDefined();
    }
    expect(values(c.positionMappings).some((m) => !m.active)).toBe(true);
    const states = values(c.specialAssignments).map((s) => specialAssignmentState(s, NOW));
    expect(states).toEqual(expect.arrayContaining(['active', 'expired', 'scheduled']));
    const posts = values(c.announcements);
    expect(posts.length).toBeGreaterThanOrEqual(18);
    expect(
      posts.filter((p) => p.status === 'published' && p.audience.scope === 'national').length,
    ).toBeGreaterThanOrEqual(6);
    expect(posts.filter((p) => p.status === 'archived').length).toBeGreaterThanOrEqual(2);
    const events = values(c.events);
    expect(events.length).toBeGreaterThanOrEqual(14);
    expect(new Set(events.map((e) => e.category))).toEqual(new Set(EVENT_CATEGORIES));
    const resources = values(c.resources);
    expect(resources.length).toBeGreaterThanOrEqual(18);
    expect(new Set(resources.map((r) => r.category))).toEqual(new Set(RESOURCE_CATEGORIES));
    const notifications = values(c.notifications);
    expect(notifications.length).toBeGreaterThanOrEqual(60);
    expect(new Set(notifications.map((n) => n.category))).toEqual(new Set(NOTIFICATION_CATEGORIES));
    for (const userId of DEMO_USERS) {
      const mine = notifications.filter((n) => n.userId === userId);
      expect(mine.length).toBeGreaterThanOrEqual(12);
      expect(mine.some((n) => n.readAt === null)).toBe(true);
      expect(mine.some((n) => n.readAt !== null)).toBe(true);
    }
    expect(values(c.auditLog).length).toBeGreaterThanOrEqual(40);
    expect(values(c.syncJobs).length).toBeGreaterThanOrEqual(6);
    expect(
      values(c.syncExceptions).filter((e) => e.status === 'open').length,
    ).toBeGreaterThanOrEqual(5);
    expect(values(c.messages).length).toBeGreaterThanOrEqual(4);
  });

  it('publishes complete English and Bulgarian content', () => {
    for (const post of values(c.announcements).filter((p) => p.status !== 'draft')) {
      expect(incompleteLocales('announcement', post.translations), post.id).toEqual([]);
    }
    for (const event of values(c.events).filter((e) => e.status !== 'draft')) {
      expect(incompleteLocales('event', event.translations), event.id).toEqual([]);
    }
    for (const resource of values(c.resources)) {
      expect(incompleteLocales('resource', resource.translations), resource.id).toEqual([]);
    }
    for (const chapter of values(c.chapters)) {
      expect(chapter.name.en && chapter.name.bg && chapter.description.bg).toBeTruthy();
    }
  });

  it('uses only obviously fictional contact data', () => {
    for (const member of values(c.members)) {
      expect(member.private.email).toMatch(/@example\.org$/);
      if (member.private.phone) expect(member.private.phone).toMatch(/^\+359 000 000 \d{3}$/);
      expect(member.importedPosition?.isDemoData ?? true).toBe(true);
    }
  });

  it('links every notification to a real route and an entity its recipient can open', () => {
    for (const n of values(c.notifications)) {
      if (!n.link) continue;
      const pathname = n.link.to.split(/[?#]/)[0] ?? '';
      expect(matchRoutes(ROUTES, pathname), `${n.id} → ${n.link.to}`).not.toBeNull();
      const collection = COLLECTION_FOR[n.link.entityType];
      if (collection) {
        expect(
          (c[collection] as Record<string, unknown>)[n.link.entityId],
          `${n.id} → ${n.link.entityType}:${n.link.entityId}`,
        ).toBeDefined();
      }
      const subject = subjectIn(state, n.userId);
      const post = c.announcements[n.link.entityId];
      if (n.link.entityType === 'announcement' && post && pathname.startsWith('/news/')) {
        expect(pathname).toBe(`/news/${post.id}`);
        expect(canViewAnnouncement(subject, post, NOW), n.id).toBe(true);
      }
      const event = c.events[n.link.entityId];
      if (n.link.entityType === 'event' && event) {
        expect(canViewEvent(subject, event, NOW), n.id).toBe(true);
      }
      const resource = c.resources[n.link.entityId];
      if (n.link.entityType === 'resource' && resource) {
        expect(canViewResource(subject, resource, NOW), n.id).toBe(true);
      }
    }
  });

  it('renders every server message in both languages', () => {
    for (const n of values(c.notifications)) {
      expect(messageKeyExists(n.title), `${n.id} title`).toBe(true);
      expect(messageKeyExists(n.body), `${n.id} body`).toBe(true);
    }
    for (const entry of values(c.auditLog)) {
      expect(messageKeyExists(entry.summary), `${entry.id} summary`).toBe(true);
    }
  });

  it('keeps history in the past and the demo scenarios in place relative to the seed time', () => {
    const later = new Date('2027-03-01T05:30:00.000Z');
    const shifted = buildSeedState(later).collections;
    const t = later.getTime();
    for (const n of values(shifted.notifications))
      expect(Date.parse(n.createdAt)).toBeLessThanOrEqual(t);
    for (const a of values(shifted.auditLog)) expect(Date.parse(a.at)).toBeLessThanOrEqual(t);
    const ev = (id: string) => {
      const event = shifted.events[id];
      if (!event) throw new Error(id);
      return event;
    };
    const E = SEED_IDS.events;
    expect(Date.parse(ev(E.memberCanRsvp).startsAt)).toBeGreaterThan(t);
    expect(Date.parse(ev(E.full).startsAt)).toBeGreaterThan(t);
    expect(Date.parse(ev(E.pastWithAttendance).endsAt)).toBeLessThan(t);
    const deadline = ev(E.deadlinePassed);
    expect(Date.parse(deadline.registrationDeadline ?? '')).toBeLessThan(t);
    expect(Date.parse(deadline.startsAt)).toBeGreaterThan(t);
    expect(shifted.rsvps[`${E.memberCanRsvp}:u-member`]).toBeUndefined();
  });
});

describe('session persistence and reset', () => {
  it('persists writes for the browser session and resets while keeping the user signed in', async () => {
    signInAs('chapter_officer');
    const created = await createMockPostRepository().create({
      translations: { en: { title: 'Session check', summary: '', body: '' } },
      audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'all_members' },
      pinned: false,
      attachments: [],
      relatedIds: [],
    });
    expect(window.sessionStorage.getItem(STORAGE_KEYS.database)).toContain(created.id);
    db.unload();
    expect(db.get('announcements', created.id)).toBeDefined();
    resetDemoData();
    expect(db.get('announcements', created.id)).toBeUndefined();
    expect(getSessionRecord()?.userId).toBe('u-officer');
    expect(db.count('announcements')).toBe(
      Object.keys(buildSeedState(NOW).collections.announcements).length,
    );
  });
});
