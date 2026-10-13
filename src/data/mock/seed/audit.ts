import { titleWithFallback } from '@/domain/rules/translations';
import type {
  Announcement,
  AuditAction,
  AuditLogEntry,
  AuditMetadataValue,
  EntityType,
  Event,
  ID,
  LocalizedMessage,
  LocalizedText,
  MessageParam,
  Resource,
  Role,
  ScopeLevel,
} from '@/domain';

import {
  accountStatusLabel,
  participantVisibilityLabel,
  permissionLabel,
  roleLabel,
} from '../services/labels';

import { at, lt, type SeedContext } from './context';

/**
 * Audit history (≥ 40 entries) consistent with the seeded content, sync history and assignments.
 * Summaries are i18n keys (`messages.audit.*`) with bilingual params.
 */

export interface AuditSeedContext {
  posts: readonly Announcement[];
  events: readonly Event[];
  resources: readonly Resource[];
  /** Role + scope level of each actor at the time (real assignments, no demo overrides). */
  actors: Record<ID, { role: Role; scope: ScopeLevel; chapterId: ID }>;
  names: Record<ID, LocalizedText>;
  chapterNames: Record<ID, LocalizedText>;
}

export function seedAuditLog(ctx: SeedContext, data: AuditSeedContext): AuditLogEntry[] {
  const entries: AuditLogEntry[] = [];
  let counter = 0;

  const add = (
    when: [number, string],
    actorId: ID | null,
    action: AuditAction,
    entityType: EntityType,
    entityId: ID,
    chapterId: ID | null,
    summaryKey: string,
    params?: Record<string, MessageParam>,
    metadata: Record<string, AuditMetadataValue> = {},
  ): void => {
    counter += 1;
    const actor = actorId ? data.actors[actorId] : undefined;
    const summary: LocalizedMessage = params
      ? { kind: 'key', key: summaryKey, params }
      : { kind: 'key', key: summaryKey };
    entries.push({
      id: `audit-seed-${String(counter).padStart(3, '0')}`,
      at: at(ctx, when[0], when[1]),
      actorId,
      actorRole: actor?.role ?? null,
      action,
      entityType,
      entityId,
      chapterId,
      scope: actor?.scope ?? 'system',
      summary,
      metadata,
    });
  };

  const k = (name: string): string => `messages.audit.${name}`;
  const postTitle = (id: ID): LocalizedText => {
    const p = data.posts.find((x) => x.id === id);
    return p ? titleWithFallback(p.translations) : lt(id, id);
  };
  const eventTitle = (id: ID): LocalizedText => {
    const e = data.events.find((x) => x.id === id);
    return e ? titleWithFallback(e.translations) : lt(id, id);
  };
  const resourceTitle = (id: ID): LocalizedText => {
    const r = data.resources.find((x) => x.id === id);
    return r ? titleWithFallback(r.translations) : lt(id, id);
  };
  const name = (id: ID): LocalizedText => data.names[id] ?? lt(id, id);
  const chapter = (id: ID): LocalizedText => data.chapterNames[id] ?? lt(id, id);
  const chapterScope = (id: ID): LocalizedText => {
    const c = chapter(id);
    return { en: `Chapter · ${c.en}`, bg: `Обител · ${c.bg}` };
  };

  const post = (
    when: [number, string],
    actorId: ID,
    action: AuditAction,
    id: ID,
    chapterId: ID | null,
    summaryKey: string,
    extra: Record<string, MessageParam> = {},
  ) =>
    add(when, actorId, action, 'announcement', id, chapterId, k(summaryKey), {
      title: postTitle(id),
      ...extra,
    });
  const ev = (
    when: [number, string],
    actorId: ID,
    action: AuditAction,
    id: ID,
    chapterId: ID | null,
    summaryKey: string,
    extra: Record<string, MessageParam> = {},
    metadata: Record<string, AuditMetadataValue> = {},
  ) =>
    add(
      when,
      actorId,
      action,
      'event',
      id,
      chapterId,
      k(summaryKey),
      { title: eventTitle(id), ...extra },
      metadata,
    );
  const res = (
    when: [number, string],
    actorId: ID,
    action: AuditAction,
    id: ID,
    chapterId: ID | null,
    summaryKey: string,
  ) =>
    add(when, actorId, action, 'resource', id, chapterId, k(summaryKey), {
      title: resourceTitle(id),
    });

  // ---- synchronisation history ------------------------------------------------------------
  add([-29, '10:00'], 'u-admin', 'sync.started', 'sync_job', 'sync-001', null, k('syncStarted'));
  add(
    [-29, '10:04'],
    null,
    'sync.completed',
    'sync_job',
    'sync-001',
    null,
    k('syncCompleted'),
    { updated: 33, errors: 0, exceptions: 0 },
    { status: 'succeeded' },
  );
  add(
    [-22, '03:00'],
    null,
    'sync.started',
    'sync_job',
    'sync-002',
    null,
    k('syncStartedScheduled'),
  );
  add(
    [-22, '03:02'],
    null,
    'sync.completed',
    'sync_job',
    'sync-002',
    null,
    k('syncCompleted'),
    { updated: 2, errors: 1, exceptions: 3 },
    { status: 'partial' },
  );
  add(
    [-22, '03:02'],
    null,
    'role.assigned',
    'role_assignment',
    'ra-u-b03-pos',
    'ch-4',
    k('roleSynced'),
    { name: name('u-b03'), role: roleLabel(null), scope: chapterScope('ch-4') },
    { from: 'ch_mc', to: null },
  );
  add(
    [-21, '10:15'],
    'u-admin',
    'sync.exception_resolved',
    'sync_exception',
    'exc-unknown-chapter-vt01',
    null,
    k('exceptionResolved'),
    {
      ref: 'REG-10690',
      note: 'VT-01 is the registry code of the Veliko Tarnovo chapter; linked it to Tsarevgrad Tarnov.',
    },
  );
  add(
    [-21, '10:35'],
    'u-admin',
    'mapping.created',
    'position_mapping',
    'map-nat-master-councilor',
    null,
    k('mappingCreated'),
    {
      position: lt('National Master Councillor', 'Национален главен съветник'),
      role: roleLabel('nat_mc'),
    },
  );
  add(
    [-21, '10:40'],
    'u-admin',
    'sync.exception_resolved',
    'sync_exception',
    'exc-nmc-unmapped',
    null,
    k('exceptionResolved'),
    {
      ref: 'REG-10655',
      note: 'Created a mapping to National Officer for the National Master Councilor.',
    },
  );
  add(
    [-21, '10:40'],
    'u-admin',
    'role.assigned',
    'role_assignment',
    'ra-u-b03',
    'ch-4',
    k('roleSynced'),
    {
      name: name('u-b03'),
      role: roleLabel('nat_mc'),
      scope: lt('National', 'Национално'),
    },
    { from: 'member', to: 'national_officer' },
  );
  add(
    [-20, '09:30'],
    'u-admin',
    'sync.exception_ignored',
    'sync_exception',
    'exc-duplicate-twins',
    null,
    k('exceptionIgnored'),
    {
      ref: 'REG-10445',
      note: 'Different people — twin brothers with the same date of birth. Both records are correct.',
    },
  );
  add(
    [-15, '03:00'],
    null,
    'sync.started',
    'sync_job',
    'sync-003',
    null,
    k('syncStartedScheduled'),
  );
  add(
    [-15, '03:01'],
    null,
    'sync.completed',
    'sync_job',
    'sync-003',
    null,
    k('syncCompleted'),
    { updated: 0, errors: 0, exceptions: 0 },
    { status: 'succeeded' },
  );
  add([-8, '03:00'], null, 'sync.started', 'sync_job', 'sync-004', null, k('syncStartedScheduled'));
  add(
    [-8, '03:00'],
    null,
    'sync.completed',
    'sync_job',
    'sync-004',
    null,
    k('syncFailed'),
    {
      reason: lt(
        'The member registry did not respond in time (simulated).',
        'Регистърът на членовете не отговори навреме (симулация).',
      ),
    },
    { status: 'failed' },
  );
  add([-3, '14:20'], 'u-admin', 'sync.started', 'sync_job', 'sync-005', null, k('syncStarted'));
  add(
    [-3, '14:21'],
    null,
    'sync.completed',
    'sync_job',
    'sync-005',
    null,
    k('syncCompleted'),
    { updated: 3, errors: 0, exceptions: 0 },
    { status: 'succeeded' },
  );
  add(
    [-3, '14:21'],
    null,
    'role.assigned',
    'role_assignment',
    'ra-u-s03-pos',
    'ch-1',
    k('roleSynced'),
    { name: name('u-s03'), role: roleLabel('ch_jc'), scope: chapterScope('ch-1') },
    { from: null, to: 'ch_jc' },
  );
  add([-1, '03:00'], null, 'sync.started', 'sync_job', 'sync-006', null, k('syncStartedScheduled'));
  add(
    [-1, '03:01'],
    null,
    'sync.completed',
    'sync_job',
    'sync-006',
    null,
    k('syncCompleted'),
    { updated: 2, errors: 1, exceptions: 5 },
    { status: 'partial' },
  );

  // ---- access: roles, special permissions, mappings, accounts -----------------------------
  add(
    [-62, '12:00'],
    'u-admin',
    'special_assignment.created',
    'special_assignment',
    'sa-charity-run',
    'ch-1',
    k('specialAssignmentCreated'),
    {
      name: name('u-s05'),
      permission: permissionLabel('event.create'),
      end: lt('the end of the charity run', 'края на благотворителното бягане'),
    },
  );
  add(
    [-60, '11:00'],
    'u-admin',
    'role.assigned',
    'role_assignment',
    'ra-u-s12-ch_chairman',
    'ch-5',
    k('roleAssigned'),
    {
      name: name('u-s12'),
      role: roleLabel('ch_chairman'),
      scope: chapterScope('ch-5'),
      reason: 'Acting Chapter Chairman for Veliko Tarnovo.',
    },
    { to: 'ch_chairman', source: 'manual' },
  );
  add(
    [-55, '10:00'],
    'u-admin',
    'member.status_changed',
    'member',
    'u-p06',
    'ch-2',
    k('memberStatusChanged'),
    {
      name: name('u-p06'),
      status: accountStatusLabel('suspended'),
      reason: 'Membership paused at the family’s request.',
    },
    { from: 'active', to: 'suspended' },
  );
  add(
    [-45, '09:00'],
    'u-admin',
    'mapping.updated',
    'position_mapping',
    'map-ch-sentinel-legacy',
    null,
    k('mappingUpdated'),
    { position: lt('Sentinel', 'Страж'), role: roleLabel('ch_jc') },
    { active: false },
  );
  add(
    [-45, '09:05'],
    'u-admin',
    'mapping.created',
    'position_mapping',
    'map-ch-sentinel',
    null,
    k('mappingCreated'),
    { position: lt('Sentinel', 'Страж'), role: roleLabel(null) },
  );
  add(
    [-40, '16:00'],
    'u-admin',
    'member.status_changed',
    'member',
    'u-s10',
    'ch-1',
    k('memberStatusChanged'),
    {
      name: name('u-s10'),
      status: accountStatusLabel('suspended'),
      reason: 'No contact for six months; paused until the advisor speaks with the family.',
    },
    { from: 'active', to: 'suspended' },
  );
  add(
    [-30, '12:00'],
    'u-admin',
    'role.assigned',
    'role_assignment',
    'ra-u-v03-ch_sec',
    'ch-3',
    k('roleAssigned'),
    {
      name: name('u-v03'),
      role: roleLabel('ch_sec'),
      scope: chapterScope('ch-3'),
      reason: 'Acting Secretary for Varna until the registry is updated.',
    },
    { to: 'ch_sec', source: 'manual' },
  );
  add(
    [-15, '11:00'],
    'u-admin',
    'special_assignment.created',
    'special_assignment',
    'sa-plovdiv-publish',
    'ch-2',
    k('specialAssignmentCreated'),
    {
      name: name('u-p02'),
      permission: permissionLabel('post.publish'),
      end: lt('the end of the advisor’s absence', 'връщането на съветника'),
    },
  );
  add(
    [-14, '10:00'],
    'u-admin',
    'special_assignment.revoked',
    'special_assignment',
    'sa-plovdiv-publish',
    'ch-2',
    k('specialAssignmentRevoked'),
    {
      name: name('u-p02'),
      permission: permissionLabel('post.publish'),
      reason: 'Granted by mistake — publishing stays with the Chapter Chairman.',
    },
  );
  add(
    [-4, '12:00'],
    'u-admin',
    'special_assignment.created',
    'special_assignment',
    'sa-welcome-pack',
    'ch-1',
    k('specialAssignmentCreated'),
    {
      name: name('u-s07'),
      permission: permissionLabel('resource.upload'),
      end: lt('the end of the autumn intake', 'края на есенния прием'),
    },
  );
  add(
    [-2, '13:00'],
    'u-admin',
    'special_assignment.created',
    'special_assignment',
    'sa-conference-comms',
    null,
    k('specialAssignmentCreated'),
    {
      name: name('u-b01'),
      permission: permissionLabel('notification.send.national'),
      end: lt('the end of the conference', 'края на конференцията'),
    },
  );
  add(
    [-12, '19:00'],
    'u-national-officer',
    'auth.password_changed',
    'user',
    'u-national-officer',
    'ch-2',
    'auditActions.auth.password_changed',
  );
  add(
    [-9, '13:00'],
    'u-admin',
    'chapter.updated',
    'chapter',
    'ch-5',
    'ch-5',
    k('chapterUpdated'),
    { chapter: chapter('ch-5') },
    { fields: 'meeting' },
  );
  add(
    [-6, '08:00'],
    'u-admin',
    'notification.broadcast',
    'notification',
    'broadcast-maintenance',
    null,
    k('broadcast'),
    { title: lt('Scheduled maintenance (simulated)', 'Планирана поддръжка (симулация)'), count: 5 },
    { audience: 'national' },
  );

  // ---- announcements ------------------------------------------------------------------------
  post(
    [-41, '17:00'],
    'u-national-officer',
    'post.created',
    'ann-nat-obligatory-days',
    null,
    'postCreated',
  );
  post(
    [-40, '10:00'],
    'u-national-officer',
    'post.published',
    'ann-nat-obligatory-days',
    null,
    'postPublished',
  );
  post(
    [-37, '20:00'],
    'u-p03',
    'post.submitted',
    'ann-ch2-unification-day',
    'ch-2',
    'postSubmitted',
  );
  post(
    [-36, '19:00'],
    'u-p04',
    'post.published',
    'ann-ch2-unification-day',
    'ch-2',
    'postPublished',
  );
  post(
    [-30, '10:00'],
    'u-national-officer',
    'post.archived',
    'ann-nat-archived-camp',
    null,
    'postArchived',
  );
  post([-25, '12:00'], 'u-admin', 'post.published', 'ann-nat-privacy', null, 'postPublished');
  post([-20, '15:00'], 'u-admin', 'post.published', 'ann-nat-branding', null, 'postPublished');
  post(
    [-19, '21:00'],
    'u-officer',
    'post.submitted',
    'ann-ch1-meeting-schedule',
    'ch-1',
    'postSubmitted',
  );
  post(
    [-18, '20:00'],
    'u-advisor',
    'post.published',
    'ann-ch1-meeting-schedule',
    'ch-1',
    'postPublished',
  );
  post([-14, '10:00'], 'u-admin', 'post.published', 'ann-nat-scholarship', null, 'postPublished');
  post(
    [-14, '12:00'],
    'u-b02',
    'post.published',
    'ann-ch4-coastal-cleanup',
    'ch-4',
    'postPublished',
  );
  post(
    [-12, '18:00'],
    'u-advisor',
    'post.published',
    'ann-ch1-food-drive',
    'ch-1',
    'postPublished',
  );
  post(
    [-10, '11:00'],
    'u-national-officer',
    'post.published',
    'ann-nat-day-of-comfort',
    null,
    'postPublished',
  );
  post([-9, '18:30'], 'u-t02', 'post.published', 'ann-ch5-history-walk', 'ch-5', 'postPublished');
  post(
    [-8, '17:00'],
    'u-national-officer',
    'post.published',
    'ann-multi-service-weekend',
    null,
    'postPublished',
  );
  post(
    [-7, '16:00'],
    'u-advisor',
    'post.published',
    'ann-ch1-study-group',
    'ch-1',
    'postPublished',
  );
  post(
    [-6, '09:30'],
    'u-national-officer',
    'post.published',
    'ann-nat-frank-land',
    null,
    'postPublished',
  );
  post(
    [-5, '21:00'],
    'u-advisor',
    'post.published',
    'ann-ch1-attendance-briefing',
    'ch-1',
    'postPublished',
  );
  post(
    [-5, '10:00'],
    'u-officer',
    'post.submitted',
    'ann-ch1-returned-bowling',
    'ch-1',
    'postSubmitted',
  );
  post(
    [-4, '09:30'],
    'u-advisor',
    'post.returned',
    'ann-ch1-returned-bowling',
    'ch-1',
    'postReturned',
    {
      note: 'Please add the cost per person and the meeting point in both languages.',
    },
  );
  post(
    [-4, '18:00'],
    'u-admin',
    'post.published',
    'ann-nat-leadership-briefing',
    null,
    'postPublished',
  );
  post(
    [-3, '20:00'],
    'u-officer',
    'post.submitted',
    'ann-ch1-installation',
    'ch-1',
    'postSubmitted',
  );
  post(
    [-3, '10:00'],
    'u-national-officer',
    'post.published',
    'ann-nat-conference',
    null,
    'postPublished',
  );
  post(
    [-2, '19:00'],
    'u-advisor',
    'post.published',
    'ann-ch1-installation',
    'ch-1',
    'postPublished',
  );
  post(
    [-2, '17:40'],
    'u-s01',
    'post.submitted',
    'ann-ch1-submitted-library',
    'ch-1',
    'postSubmitted',
  );
  post(
    [-2, '11:00'],
    'u-national-officer',
    'post.created',
    'ann-nat-draft-workshops',
    null,
    'postCreated',
  );
  post(
    [-1, '16:00'],
    'u-national-officer',
    'post.updated',
    'ann-nat-draft-workshops',
    null,
    'postUpdated',
  );
  post([-1, '12:00'], 'u-b03', 'post.submitted', 'ann-nat-submitted-survey', null, 'postSubmitted');
  post(
    [-1, '20:15'],
    'u-officer',
    'post.submitted',
    'ann-ch1-submitted-comfort',
    'ch-1',
    'postSubmitted',
  );
  post([-1, '21:00'], 'u-officer', 'post.created', 'ann-ch1-draft-bazaar', 'ch-1', 'postCreated');

  // ---- events & attendance --------------------------------------------------------------------
  ev(
    [-44, '10:00'],
    'u-officer',
    'event.published',
    'ev-ch1-past-parents-evening',
    'ch-1',
    'eventPublished',
  );
  ev([-43, '10:00'], 'u-p03', 'event.published', 'ev-ch2-past-wreath', 'ch-2', 'eventPublished');
  ev(
    [-35, '19:00'],
    'u-p03',
    'attendance.recorded',
    'ev-ch2-past-wreath',
    'ch-2',
    'attendanceRecorded',
    { count: 6 },
  );
  ev(
    [-29, '10:00'],
    'u-officer',
    'event.published',
    'ev-ch1-past-food-drive',
    'ch-1',
    'eventPublished',
  );
  ev(
    [-27, '10:00'],
    'u-national-officer',
    'event.published',
    'ev-nat-past-portal-briefing',
    null,
    'eventPublished',
  );
  ev(
    [-19, '09:00'],
    'u-national-officer',
    'attendance.recorded',
    'ev-nat-past-portal-briefing',
    null,
    'attendanceRecorded',
    { count: 7 },
  );
  ev(
    [-15, '18:00'],
    'u-officer',
    'attendance.recorded',
    'ev-ch1-past-food-drive',
    'ch-1',
    'attendanceRecorded',
    { count: 8 },
  );
  ev(
    [-11, '18:00'],
    'u-officer',
    'event.published',
    'ev-ch1-hike-cancelled',
    'ch-1',
    'eventPublished',
  );
  ev(
    [-10, '10:00'],
    'u-officer',
    'event.published',
    'ev-ch1-meeting-next',
    'ch-1',
    'eventPublished',
  );
  ev(
    [-8, '10:00'],
    'u-officer',
    'attendance.recorded',
    'ev-ch1-past-meeting',
    'ch-1',
    'attendanceRecorded',
    { count: 12 },
  );
  ev([-7, '16:00'], 'u-s01', 'event.published', 'ev-ch1-study-session', 'ch-1', 'eventPublished');
  ev(
    [-6, '12:00'],
    'u-officer',
    'event.published',
    'ev-ch1-installation',
    'ch-1',
    'eventPublished',
  );
  ev([-6, '19:00'], 'u-officer', 'event.published', 'ev-ch1-bowling', 'ch-1', 'eventPublished');
  ev(
    [-5, '18:00'],
    'u-advisor',
    'event.capacity_changed',
    'ev-ch1-bowling',
    'ch-1',
    'eventCapacityChanged',
    { capacity: 8 },
    { from: 10, to: 8 },
  );
  ev([-5, '10:00'], 'u-p03', 'event.published', 'ev-ch2-football', 'ch-2', 'eventPublished');
  ev(
    [-3, '21:00'],
    'u-advisor',
    'event.note_added',
    'ev-ch1-installation',
    'ch-1',
    'eventNoteAdded',
  );
  ev(
    [-3, '10:05'],
    'u-national-officer',
    'event.published',
    'ev-nat-conference',
    null,
    'eventPublished',
  );
  ev(
    [-2, '19:30'],
    'u-officer',
    'event.note_added',
    'ev-ch1-meeting-next',
    'ch-1',
    'eventNoteAdded',
  );
  ev(
    [-1, '09:15'],
    'u-advisor',
    'event.cancelled',
    'ev-ch1-hike-cancelled',
    'ch-1',
    'eventCancelled',
    {
      reason: 'Severe weather warning for the mountain.',
    },
  );
  ev(
    [-1, '21:00'],
    'u-officer',
    'event.published',
    'ev-ch1-day-of-comfort',
    'ch-1',
    'eventPublished',
  );
  ev(
    [-1, '21:05'],
    'u-officer',
    'event.visibility_changed',
    'ev-ch1-day-of-comfort',
    'ch-1',
    'eventVisibilityChanged',
    {
      visibility: participantVisibilityLabel('organizers'),
    },
  );
  ev([-1, '21:30'], 'u-officer', 'event.created', 'ev-ch1-draft-bazaar', 'ch-1', 'eventCreated');

  // ---- resources & translations -------------------------------------------------------------
  res(
    [-31, '10:00'],
    'u-national-officer',
    'resource.created',
    'res-officer-handbook',
    null,
    'resourceCreated',
  );
  res(
    [-30, '10:00'],
    'u-national-officer',
    'resource.archived',
    'res-officer-handbook-2024',
    null,
    'resourceArchived',
  );
  res([-25, '12:30'], 'u-admin', 'resource.updated', 'res-privacy-policy', null, 'resourceUpdated');
  add(
    [-25, '13:00'],
    'u-admin',
    'translation.reviewed',
    'translation',
    'resource:res-photo-guidelines',
    null,
    k('translationReviewedBg'),
    { title: resourceTitle('res-photo-guidelines') },
  );
  res(
    [-21, '11:00'],
    'u-admin',
    'resource.created',
    'res-brand-guidelines',
    null,
    'resourceCreated',
  );
  res([-21, '11:05'], 'u-admin', 'resource.created', 'res-logo-pack', null, 'resourceCreated');
  res(
    [-18, '20:30'],
    'u-officer',
    'resource.created',
    'res-ch1-term-calendar',
    'ch-1',
    'resourceCreated',
  );
  res(
    [-9, '15:00'],
    'u-admin',
    'resource.updated',
    'res-minutes-template',
    null,
    'resourceUpdated',
  );
  res(
    [-5, '17:00'],
    'u-officer',
    'resource.created',
    'res-ch1-attendance-sheet',
    'ch-1',
    'resourceCreated',
  );
  res(
    [-3, '18:00'],
    'u-s07',
    'resource.created',
    'res-ch1-welcome-pack',
    'ch-1',
    'resourceCreated',
  );

  // ---- sign-ins -------------------------------------------------------------------------------
  add(
    [-2, '08:40'],
    'u-national-officer',
    'auth.login',
    'user',
    'u-national-officer',
    'ch-2',
    'auditActions.auth.login',
  );
  add([-1, '07:55'], 'u-admin', 'auth.login', 'user', 'u-admin', 'ch-3', 'auditActions.auth.login');
  add(
    [-1, '19:50'],
    'u-officer',
    'auth.login',
    'user',
    'u-officer',
    'ch-1',
    'auditActions.auth.login',
  );
  add(
    [-1, '20:30'],
    'u-advisor',
    'auth.login',
    'user',
    'u-advisor',
    'ch-1',
    'auditActions.auth.login',
  );

  return entries;
}
