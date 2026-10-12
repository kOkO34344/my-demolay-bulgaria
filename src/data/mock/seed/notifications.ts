import { titleWithFallback, fieldWithFallback } from '@/domain/rules/translations';
import type {
  Announcement,
  EntityType,
  Event,
  ID,
  InAppMessage,
  LocalizedMessage,
  LocalizedText,
  MessageParam,
  Notification,
  NotificationCategory,
  NotificationLink,
  Resource,
} from '@/domain';
import { formatDate } from '@/i18n/format';
import { paths } from '@/lib/routes';

import { permissionLabel } from '../services/labels';

import { ago, at, lt, type SeedContext } from './context';

/**
 * Notifications (12–14 per demo user, read/unread mix, every category) and a few in-app messages
 * between demo users. Every link points to a REAL seeded entity and a route from src/lib/routes.ts.
 * Titles/bodies are i18n keys from the `messages` fragment, rendered with useMessageFormatter().
 */

export interface NotificationSeedContext {
  posts: readonly Announcement[];
  events: readonly Event[];
  resources: readonly Resource[];
}

const key = (k: string, params?: Record<string, MessageParam>): LocalizedMessage =>
  params
    ? { kind: 'key', key: `messages.notifications.${k}`, params }
    : { kind: 'key', key: `messages.notifications.${k}` };

const link = (to: string, entityType: EntityType, entityId: ID): NotificationLink => ({
  to,
  entityType,
  entityId,
});

const dateText = (iso: string): LocalizedText => ({
  en: formatDate(iso, 'en', 'long'),
  bg: formatDate(iso, 'bg', 'long'),
});

interface Spec {
  category: NotificationCategory;
  title: LocalizedMessage;
  body: LocalizedMessage;
  link: NotificationLink | null;
  actorId: ID | null;
  /** Hours before the seed time. */
  hoursAgo: number;
  read: boolean;
}

export const SEED_MESSAGE_IDS = {
  officerToMember: 'msg-officer-member-flag',
  memberToOfficer: 'msg-member-officer-bowling',
  officerToAdvisor: 'msg-officer-advisor-comfort',
  advisorToOfficer: 'msg-advisor-officer-bowling',
  adminToNational: 'msg-admin-national-registrations',
  nationalToAdmin: 'msg-national-admin-inspector',
} as const;

export function seedMessages(ctx: SeedContext): InAppMessage[] {
  const m = (
    id: ID,
    fromUserId: ID,
    toUserId: ID,
    hoursAgo: number,
    readHoursAgo: number | null,
    subject: string,
    body: string,
  ): InAppMessage => ({
    id,
    fromUserId,
    toUserId,
    subject,
    body,
    createdAt: ago(ctx, { hours: hoursAgo }),
    readAt: readHoursAgo === null ? null : ago(ctx, { hours: readHoursAgo }),
  });
  return [
    m(
      SEED_MESSAGE_IDS.memberToOfficer,
      'u-member',
      'u-officer',
      70,
      66,
      'Bowling night',
      'Hi Viktor, is there still a place for the bowling night? I forgot to reply in time.',
    ),
    m(
      SEED_MESSAGE_IDS.officerToMember,
      'u-officer',
      'u-member',
      20,
      null,
      'Chapter flag for the installation',
      'Hi Martin, the bowling night is full, sorry! Could you bring the chapter flag to the installation rehearsal? As Standard Bearer you will carry it during the ceremony. Thanks!',
    ),
    m(
      SEED_MESSAGE_IDS.officerToAdvisor,
      'u-officer',
      'u-advisor',
      26,
      22,
      'Day of Comfort post',
      'I submitted the Day of Comfort announcement for review. The event is already published with 12 places.',
    ),
    m(
      SEED_MESSAGE_IDS.advisorToOfficer,
      'u-advisor',
      'u-officer',
      94,
      null,
      'Bowling announcement',
      'Thanks for the bowling post. I returned it with two small notes — add the cost and the meeting point and send it again.',
    ),
    m(
      SEED_MESSAGE_IDS.adminToNational,
      'u-admin',
      'u-national-officer',
      9,
      null,
      'Conference registrations',
      'Registrations are coming in well — 18 confirmed so far. Shall we open the waiting list once we reach 100?',
    ),
    m(
      SEED_MESSAGE_IDS.nationalToAdmin,
      'u-national-officer',
      'u-admin',
      30,
      28,
      'National Inspector mapping',
      'The National Inspector position from the registry has no mapping yet. Could you check the exception before the next sync?',
    ),
  ];
}

export function seedNotifications(ctx: SeedContext, data: NotificationSeedContext): Notification[] {
  const post = (id: ID): Announcement => {
    const p = data.posts.find((x) => x.id === id);
    if (!p) throw new Error(`Seed notification references unknown post ${id}`);
    return p;
  };
  const event = (id: ID): Event => {
    const e = data.events.find((x) => x.id === id);
    if (!e) throw new Error(`Seed notification references unknown event ${id}`);
    return e;
  };
  const resource = (id: ID): Resource => {
    const r = data.resources.find((x) => x.id === id);
    if (!r) throw new Error(`Seed notification references unknown resource ${id}`);
    return r;
  };

  const postPublished = (id: ID, actorId: ID, hoursAgo: number, read: boolean): Spec => {
    const p = post(id);
    return {
      category: 'announcements',
      title: key('postPublished.title', { title: titleWithFallback(p.translations) }),
      body: key('postPublished.body', { summary: fieldWithFallback(p.translations, 'summary') }),
      link: link(paths.newsDetail(id), 'announcement', id),
      actorId,
      hoursAgo,
      read,
    };
  };
  const reviewRequested = (
    id: ID,
    hoursAgo: number,
    read: boolean,
    author: LocalizedText,
  ): Spec => ({
    category: 'approvals',
    title: key('postSubmitted.title', { title: titleWithFallback(post(id).translations) }),
    body: key('postSubmitted.body', { author }),
    link: link(paths.contentEdit(id), 'announcement', id),
    actorId: post(id).authorId,
    hoursAgo,
    read,
  });
  const eventPublished = (id: ID, actorId: ID, hoursAgo: number, read: boolean): Spec => {
    const e = event(id);
    return {
      category: 'events',
      title: key('eventPublished.title', { title: titleWithFallback(e.translations) }),
      body: key('eventPublished.body', {
        date: dateText(e.startsAt),
        summary: fieldWithFallback(e.translations, 'summary'),
      }),
      link: link(paths.eventDetail(id), 'event', id),
      actorId,
      hoursAgo,
      read,
    };
  };
  const eventSpec = (
    id: ID,
    k: string,
    params: Record<string, MessageParam>,
    hoursAgo: number,
    read: boolean,
    actorId: ID | null = null,
  ): Spec => ({
    category: 'events',
    title: key(`${k}.title`, { title: titleWithFallback(event(id).translations) }),
    body: key(`${k}.body`, params),
    link: link(paths.eventDetail(id), 'event', id),
    actorId,
    hoursAgo,
    read,
  });
  const resourceAdded = (id: ID, actorId: ID, hoursAgo: number, read: boolean): Spec => {
    const r = resource(id);
    return {
      category: 'resources',
      title: key('resourceAdded.title', { title: titleWithFallback(r.translations) }),
      body: key('resourceAdded.body', {
        description: fieldWithFallback(r.translations, 'description'),
      }),
      link: link(paths.resources({ q: r.translations.en?.title }), 'resource', id),
      actorId,
      hoursAgo,
      read,
    };
  };
  const messageReceived = (
    messageId: ID,
    from: ID,
    name: LocalizedText,
    subject: string,
    hoursAgo: number,
    read: boolean,
  ): Spec => ({
    category: 'chapter',
    title: key('messageReceived.title', { name }),
    body: key('messageReceived.body', { subject }),
    link: link(paths.chapter(), 'message', messageId),
    actorId: from,
    hoursAgo,
    read,
  });
  const newSignIn = (userId: ID, hoursAgo: number): Spec => ({
    category: 'account',
    title: key('newSignIn.title'),
    body: key('newSignIn.body'),
    link: link(paths.profile('security'), 'user', userId),
    actorId: null,
    hoursAgo,
    read: true,
  });
  const maintenance = (hoursAgo: number, read: boolean): Spec => ({
    category: 'system',
    title: key('maintenance.title'),
    body: key('maintenance.body'),
    link: null,
    actorId: 'u-admin',
    hoursAgo,
    read,
  });

  const names = {
    officer: lt('Viktor Stoyanov', 'Виктор Стоянов'),
    advisor: lt('Hristo Dimitrov', 'Христо Димитров'),
    national: lt('Georgi Kolev', 'Георги Колев'),
    admin: lt('Petar Nikolov', 'Петър Николов'),
    daniel: lt('Daniel Iliev', 'Даниел Илиев'),
    petko: lt('Petko Karaivanov', 'Петко Караиванов'),
    lyubomir: lt('Lyubomir Nedelchev', 'Любомир Неделчев'),
    simeon: lt('Simeon Atanasov', 'Симеон Атанасов'),
    teodor: lt('Teodor Kirilov', 'Теодор Кирилов'),
    momchil: lt('Momchil Dragnev', 'Момчил Драгнев'),
  };

  const comfort = event('ev-ch1-day-of-comfort');
  const installation = event('ev-ch1-installation');

  const perUser: Record<ID, Spec[]> = {
    'u-member': [
      postPublished('ann-ch1-installation', 'u-advisor', 40, false),
      postPublished('ann-nat-conference', 'u-national-officer', 70, false),
      eventSpec(
        'ev-ch1-hike-cancelled',
        'eventCancelled',
        { reason: event('ev-ch1-hike-cancelled').cancelledReason ?? '' },
        23,
        false,
        'u-advisor',
      ),
      eventSpec(
        'ev-ch1-installation',
        'eventReminder',
        { date: dateText(installation.registrationDeadline ?? installation.startsAt) },
        18,
        false,
      ),
      messageReceived(
        SEED_MESSAGE_IDS.officerToMember,
        'u-officer',
        names.officer,
        'Chapter flag for the installation',
        20,
        false,
      ),
      postPublished('ann-ch1-study-group', 'u-advisor', 166, false),
      eventPublished('ev-ch1-installation', 'u-officer', 142, true),
      eventSpec('ev-ch1-meeting-next', 'eventUpdated', {}, 50, true, 'u-officer'),
      resourceAdded('res-ch1-welcome-pack', 'u-s07', 70, true),
      postPublished('ann-nat-frank-land', 'u-national-officer', 142, true),
      eventPublished('ev-nat-public-speaking', 'u-national-officer', 190, true),
      {
        category: 'account',
        title: key('positionUpdated.title'),
        body: key('positionUpdated.body', { position: lt('Standard Bearer', 'Знаменосец') }),
        link: link(paths.profile(), 'member', 'u-member'),
        actorId: null,
        hoursAgo: 21,
        read: true,
      },
      newSignIn('u-member', 30),
      maintenance(150, true),
    ],
    'u-officer': [
      {
        category: 'approvals',
        title: key('postReturned.title', {
          title: titleWithFallback(post('ann-ch1-returned-bowling').translations),
        }),
        body: key('postReturned.body', {
          reviewer: names.advisor,
          note: post('ann-ch1-returned-bowling').reviewNote ?? '',
        }),
        link: link(
          paths.contentEdit('ann-ch1-returned-bowling'),
          'announcement',
          'ann-ch1-returned-bowling',
        ),
        actorId: 'u-advisor',
        hoursAgo: 94,
        read: false,
      },
      {
        category: 'approvals',
        title: key('postPublishedAuthor.title', {
          title: titleWithFallback(post('ann-ch1-installation').translations),
        }),
        body: key('postPublishedAuthor.body'),
        link: link(
          paths.newsDetail('ann-ch1-installation'),
          'announcement',
          'ann-ch1-installation',
        ),
        actorId: 'u-advisor',
        hoursAgo: 40,
        read: true,
      },
      eventSpec('ev-ch1-installation', 'eventNewReplies', { count: 6 }, 10, false),
      eventSpec('ev-ch1-past-parents-evening', 'attendanceMissing', {}, 28, false),
      postPublished('ann-nat-leadership-briefing', 'u-admin', 90, false),
      postPublished('ann-nat-conference', 'u-national-officer', 70, false),
      messageReceived(
        SEED_MESSAGE_IDS.advisorToOfficer,
        'u-advisor',
        names.advisor,
        'Bowling announcement',
        94,
        false,
      ),
      eventSpec(
        'ev-ch1-hike-cancelled',
        'eventCancelled',
        { reason: event('ev-ch1-hike-cancelled').cancelledReason ?? '' },
        23,
        true,
        'u-advisor',
      ),
      eventSpec('ev-ch1-bowling', 'eventFull', {}, 60, true),
      resourceAdded('res-minutes-template', 'u-admin', 210, true),
      eventPublished('ev-nat-public-speaking', 'u-national-officer', 190, true),
      newSignIn('u-officer', 26),
      maintenance(150, true),
    ],
    'u-advisor': [
      reviewRequested('ann-ch1-submitted-comfort', 26, false, names.officer),
      reviewRequested('ann-ch1-submitted-library', 50, false, names.daniel),
      {
        category: 'approvals',
        title: key('pendingAccount.title', { name: names.lyubomir }),
        body: key('pendingAccount.body'),
        link: link(paths.memberDetail('u-s11'), 'member', 'u-s11'),
        actorId: null,
        hoursAgo: 140,
        read: false,
      },
      eventSpec(
        'ev-ch1-day-of-comfort',
        'eventAlmostFull',
        { count: Math.max(0, (comfort.capacity ?? 0) - 10) },
        12,
        false,
      ),
      eventSpec('ev-ch1-past-parents-evening', 'attendanceMissing', {}, 28, false),
      postPublished('ann-nat-leadership-briefing', 'u-admin', 90, false),
      eventSpec('ev-ch1-bowling', 'eventFull', {}, 60, true),
      postPublished('ann-nat-conference', 'u-national-officer', 70, true),
      messageReceived(
        SEED_MESSAGE_IDS.officerToAdvisor,
        'u-officer',
        names.officer,
        'Day of Comfort post',
        26,
        true,
      ),
      {
        category: 'chapter',
        title: key('memberStatusChanged.title', { name: names.simeon }),
        body: key('memberStatusChanged.body', { status: lt('Suspended', 'Временно спрян') }),
        link: link(paths.memberDetail('u-s10'), 'member', 'u-s10'),
        actorId: 'u-admin',
        hoursAgo: 960,
        read: true,
      },
      {
        category: 'chapter',
        title: key('specialAssignmentNotice.title', { name: names.teodor }),
        body: key('specialAssignmentNotice.body', {
          permission: permissionLabel('resource.upload'),
          end: dateText(at(ctx, 26, '23:59')),
        }),
        link: link(paths.memberDetail('u-s07'), 'special_assignment', 'sa-welcome-pack'),
        actorId: 'u-advisor',
        hoursAgo: 96,
        read: true,
      },
      resourceAdded('res-youth-protection', 'u-admin', 264, true),
      newSignIn('u-advisor', 22),
    ],
    'u-national-officer': [
      reviewRequested('ann-nat-submitted-survey', 32, false, names.petko),
      eventSpec('ev-nat-conference', 'eventNewReplies', { count: 18 }, 6, false),
      messageReceived(
        SEED_MESSAGE_IDS.adminToNational,
        'u-admin',
        names.admin,
        'Conference registrations',
        9,
        false,
      ),
      postPublished('ann-nat-privacy', 'u-admin', 598, false),
      eventPublished('ev-ch2-football', 'u-p03', 118, false),
      {
        category: 'approvals',
        title: key('postPublishedAuthor.title', {
          title: titleWithFallback(post('ann-nat-conference').translations),
        }),
        body: key('postPublishedAuthor.body'),
        link: link(paths.newsDetail('ann-nat-conference'), 'announcement', 'ann-nat-conference'),
        actorId: 'u-national-officer',
        hoursAgo: 70,
        read: true,
      },
      eventSpec('ev-nat-public-speaking', 'eventNewReplies', { count: 5 }, 48, true),
      postPublished('ann-ch2-unification-day', 'u-p04', 860, true),
      postPublished('ann-ch4-coastal-cleanup', 'u-b02', 330, true),
      postPublished('ann-nat-leadership-briefing', 'u-admin', 90, true),
      resourceAdded('res-brand-guidelines', 'u-admin', 480, true),
      newSignIn('u-national-officer', 44),
      maintenance(150, true),
    ],
    'u-admin': [
      {
        category: 'system',
        title: key('syncPartial.title'),
        body: key('syncPartial.body', { updated: 2, errors: 1, exceptions: 5 }),
        link: link(paths.adminSection('sync'), 'sync_job', 'sync-006'),
        actorId: null,
        hoursAgo: 21,
        read: false,
      },
      {
        category: 'approvals',
        title: key('syncException.title'),
        body: key('syncException.body', {
          details: lt(
            'The position “National Inspector” (NAT_INSPECTOR) has no active mapping rule.',
            'Длъжността „Национален инспектор“ (NAT_INSPECTOR) няма активно правило за съответствие.',
          ),
        }),
        link: link(paths.adminSection('sync'), 'sync_exception', 'exc-inspector-unmapped'),
        actorId: null,
        hoursAgo: 21,
        read: false,
      },
      {
        category: 'approvals',
        title: key('pendingAccount.title', { name: names.lyubomir }),
        body: key('pendingAccount.body'),
        link: link(paths.memberDetail('u-s11'), 'member', 'u-s11'),
        actorId: null,
        hoursAgo: 140,
        read: false,
      },
      {
        category: 'system',
        title: key('translationsWaiting.title'),
        body: key('translationsWaiting.body', { count: 9 }),
        link: link(
          paths.adminSection('translations'),
          'translation',
          'announcement:ann-ch1-draft-bazaar',
        ),
        actorId: null,
        hoursAgo: 8,
        read: false,
      },
      messageReceived(
        SEED_MESSAGE_IDS.nationalToAdmin,
        'u-national-officer',
        names.national,
        'National Inspector mapping',
        30,
        false,
      ),
      eventSpec('ev-nat-conference', 'eventNewReplies', { count: 18 }, 6, false),
      {
        category: 'system',
        title: key('syncFailed.title'),
        body: key('syncFailed.body', {
          reason: lt(
            'The member registry did not respond within 30 seconds (simulated timeout).',
            'Регистърът на членовете не отговори в рамките на 30 секунди (симулирано изтичане на времето).',
          ),
        }),
        link: link(paths.adminSection('sync'), 'sync_job', 'sync-004'),
        actorId: null,
        hoursAgo: 189,
        read: true,
      },
      {
        category: 'account',
        title: key('failedSignIns.title'),
        body: key('failedSignIns.body', { count: 3 }),
        link: link(paths.profile('security'), 'user', 'u-admin'),
        actorId: null,
        hoursAgo: 100,
        read: true,
      },
      {
        category: 'chapter',
        title: key('chapterUpdated.title', {
          chapter: lt('Tsarevgrad Tarnov Chapter', 'Обител „Царевград Търнов“'),
        }),
        body: key('chapterUpdated.body'),
        link: link(paths.adminSection('chapters'), 'chapter', 'ch-5'),
        actorId: 'u-admin',
        hoursAgo: 286,
        read: true,
      },
      {
        category: 'approvals',
        title: key('specialAssignmentNotice.title', { name: names.momchil }),
        body: key('specialAssignmentNotice.body', {
          permission: permissionLabel('notification.send.national'),
          end: dateText(at(ctx, 40, '23:59')),
        }),
        link: link(paths.adminSection('permissions'), 'special_assignment', 'sa-conference-comms'),
        actorId: 'u-admin',
        hoursAgo: 49,
        read: true,
      },
      {
        category: 'system',
        title: key('mappingDeactivated.title', { position: lt('Sentinel', 'Страж') }),
        body: key('mappingDeactivated.body'),
        link: link(paths.adminSection('mappings'), 'position_mapping', 'map-ch-sentinel-legacy'),
        actorId: 'u-admin',
        hoursAgo: 1083,
        read: true,
      },
      postPublished('ann-nat-conference', 'u-national-officer', 70, true),
      newSignIn('u-admin', 20),
    ],
  };

  const notifications: Notification[] = [];
  for (const [userId, specs] of Object.entries(perUser)) {
    specs.forEach((spec, index) => {
      const createdAt = ago(ctx, { hours: spec.hoursAgo });
      notifications.push({
        id: `ntf-${userId.replace(/^u-/, '')}-${String(index + 1).padStart(2, '0')}`,
        userId,
        category: spec.category,
        title: spec.title,
        body: spec.body,
        link: spec.link,
        actorId: spec.actorId,
        createdAt,
        readAt: spec.read
          ? new Date(
              Math.min(Date.parse(createdAt) + 2 * 3600 * 1000, ctx.now.getTime() - 60_000),
            ).toISOString()
          : null,
      });
    });
  }
  return notifications;
}
