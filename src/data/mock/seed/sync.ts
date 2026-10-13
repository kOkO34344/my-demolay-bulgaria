import type {
  ID,
  LocalizedText,
  PositionChange,
  RoleChange,
  SyncCounts,
  SyncError,
  SyncException,
  SyncJob,
  SyncJobStatus,
  SyncStage,
} from '@/domain';
import type { SyncResultRecord } from '@/data/store/schema';

import { at, lt, type SeedContext } from './context';
import { POSITIONS, type PositionCode } from './positions';

/**
 * Simulated synchronisation history with the "Demo member registry (simulated)": six past jobs
 * (succeeded, partial with errors, failed), their results and the exceptions queue (5 open,
 * 2 resolved, 1 ignored). No external system is ever contacted.
 */

export const SYNC_PROVIDER_LABEL = 'Demo member registry (simulated)';

const NAMES: Record<ID, LocalizedText> = {
  'u-s01': lt('Daniel Iliev', 'Даниел Илиев'),
  'u-s02': lt('Stefan Angelov', 'Стефан Ангелов'),
  'u-s03': lt('Nikola Marinov', 'Никола Маринов'),
  'u-b01': lt('Momchil Dragnev', 'Момчил Драгнев'),
  'u-b03': lt('Petko Karaivanov', 'Петко Караиванов'),
  'u-b04': lt('Iliya Spasov', 'Илия Спасов'),
  'u-p05': lt('Yavor Kanev', 'Явор Кънев'),
};

const nameOf = (userId: ID): LocalizedText => NAMES[userId] ?? lt(userId, userId);

function change(userId: ID, from: PositionCode | null, to: PositionCode | null): PositionChange {
  return {
    userId,
    displayName: nameOf(userId),
    fromCode: from,
    toCode: to,
    fromTitle: from ? POSITIONS[from].title : null,
    toTitle: to ? POSITIONS[to].title : null,
  };
}

interface JobSeed {
  id: ID;
  status: SyncJobStatus;
  trigger: SyncJob['trigger'];
  triggeredBy: ID | null;
  start: [number, string];
  durationSeconds: number;
  stage: SyncStage;
  progress: number;
  counts: SyncCounts;
  errors: SyncError[];
  positionChanges: PositionChange[];
  roleChanges: RoleChange[];
}

const zero: SyncCounts = { imported: 0, updated: 0, unchanged: 0, deactivated: 0 };

const JOBS: JobSeed[] = [
  {
    id: 'sync-001',
    status: 'succeeded',
    trigger: 'manual',
    triggeredBy: 'u-admin',
    start: [-29, '10:00'],
    durationSeconds: 248,
    stage: 'done',
    progress: 100,
    counts: { imported: 33, updated: 0, unchanged: 0, deactivated: 0 },
    errors: [],
    positionChanges: [],
    roleChanges: [],
  },
  {
    id: 'sync-002',
    status: 'partial',
    trigger: 'scheduled',
    triggeredBy: null,
    start: [-22, '03:00'],
    durationSeconds: 96,
    stage: 'done',
    progress: 100,
    counts: { imported: 0, updated: 2, unchanged: 31, deactivated: 0 },
    errors: [
      {
        externalRef: 'REG-10690',
        message: lt(
          'The record refers to chapter code VT-01, which is not configured in the portal.',
          'Записът се отнася за обител с код VT-01, която не е настроена в портала.',
        ),
      },
    ],
    positionChanges: [
      change('u-b03', 'CH_MASTER_COUNCILOR', 'NAT_MASTER_COUNCILOR'),
      change('u-b01', 'CH_SENIOR_COUNCILOR', 'CH_MASTER_COUNCILOR'),
    ],
    roleChanges: [
      {
        userId: 'u-b03',
        displayName: nameOf('u-b03'),
        fromRole: 'ch_mc',
        toRole: null,
        scope: null,
        mappingId: null,
      },
    ],
  },
  {
    id: 'sync-003',
    status: 'succeeded',
    trigger: 'scheduled',
    triggeredBy: null,
    start: [-15, '03:00'],
    durationSeconds: 71,
    stage: 'done',
    progress: 100,
    counts: { imported: 0, updated: 0, unchanged: 33, deactivated: 0 },
    errors: [],
    positionChanges: [],
    roleChanges: [],
  },
  {
    id: 'sync-004',
    status: 'failed',
    trigger: 'scheduled',
    triggeredBy: null,
    start: [-8, '03:00'],
    durationSeconds: 31,
    stage: 'connecting',
    progress: 8,
    counts: zero,
    errors: [
      {
        externalRef: 'REGISTRY',
        message: lt(
          'The member registry did not respond within 30 seconds (simulated timeout). No changes were applied.',
          'Регистърът на членовете не отговори в рамките на 30 секунди (симулирано изтичане на времето). Не са приложени промени.',
        ),
      },
    ],
    positionChanges: [],
    roleChanges: [],
  },
  {
    id: 'sync-005',
    status: 'succeeded',
    trigger: 'manual',
    triggeredBy: 'u-admin',
    start: [-3, '14:20'],
    durationSeconds: 84,
    stage: 'done',
    progress: 100,
    counts: { imported: 0, updated: 3, unchanged: 30, deactivated: 0 },
    errors: [],
    positionChanges: [
      change('u-s01', 'CH_SENIOR_COUNCILOR', 'CH_MASTER_COUNCILOR'),
      change('u-s02', 'CH_JUNIOR_COUNCILOR', 'CH_SENIOR_COUNCILOR'),
      change('u-s03', 'CH_ACTIVE_MEMBER', 'CH_JUNIOR_COUNCILOR'),
    ],
    roleChanges: [
      {
        userId: 'u-s03',
        displayName: nameOf('u-s03'),
        fromRole: null,
        toRole: 'ch_jc',
        scope: { level: 'chapter', chapterIds: ['ch-1'] },
        mappingId: 'map-ch-junior-councilor',
      },
    ],
  },
  {
    id: 'sync-006',
    status: 'partial',
    trigger: 'scheduled',
    triggeredBy: null,
    start: [-1, '03:00'],
    durationSeconds: 102,
    stage: 'done',
    progress: 100,
    counts: { imported: 0, updated: 2, unchanged: 31, deactivated: 0 },
    errors: [
      {
        externalRef: 'REG-10719',
        message: lt(
          'Record skipped: the parental consent date is missing for a member under 18.',
          'Записът е пропуснат: липсва дата на родителското съгласие за член под 18 години.',
        ),
      },
    ],
    positionChanges: [
      change('u-p05', 'CH_ACTIVE_MEMBER', 'CH_SENIOR_DEACON'),
      change('u-b04', 'CH_ACTIVE_MEMBER', 'NAT_INSPECTOR'),
    ],
    roleChanges: [],
  },
];

/** When the most recent seeded synchronisation finished (imported-position timestamps). */
export function lastSeededSyncFinishedAt(ctx: SeedContext): string {
  const last = JOBS[JOBS.length - 1];
  if (!last) return ctx.now.toISOString();
  return new Date(
    Date.parse(at(ctx, last.start[0], last.start[1])) + last.durationSeconds * 1000,
  ).toISOString();
}

/** Finish time of a seeded job (used by other seed modules for consistent history). */
export function seededJobFinishedAt(ctx: SeedContext, jobId: ID): string {
  const job = JOBS.find((j) => j.id === jobId);
  if (!job) return ctx.now.toISOString();
  return new Date(
    Date.parse(at(ctx, job.start[0], job.start[1])) + job.durationSeconds * 1000,
  ).toISOString();
}

export interface SyncSeed {
  jobs: SyncJob[];
  results: SyncResultRecord[];
  exceptions: SyncException[];
}

export function seedSync(ctx: SeedContext): SyncSeed {
  const jobs: SyncJob[] = JOBS.map((j) => {
    const startedAt = at(ctx, j.start[0], j.start[1]);
    return {
      id: j.id,
      status: j.status,
      trigger: j.trigger,
      triggeredBy: j.triggeredBy,
      startedAt,
      finishedAt: new Date(Date.parse(startedAt) + j.durationSeconds * 1000).toISOString(),
      progress: j.progress,
      stage: j.stage,
    };
  });
  const results: SyncResultRecord[] = JOBS.map((j) => ({
    id: j.id,
    jobId: j.id,
    counts: j.counts,
    errors: j.errors,
    positionChanges: j.positionChanges,
    roleChanges: j.roleChanges,
  }));

  const created = (jobId: ID, minutes: number): string =>
    new Date(Date.parse(seededJobFinishedAt(ctx, jobId)) - minutes * 60_000).toISOString();

  const exceptions: SyncException[] = [
    {
      id: 'exc-inspector-unmapped',
      jobId: 'sync-006',
      kind: 'unmapped_position',
      externalRef: 'REG-10659',
      details: lt(
        'The position “National Inspector” (NAT_INSPECTOR) held by Iliya Spasov has no active mapping rule. He keeps basic member access until a rule exists.',
        'Длъжността „Национален инспектор“ (NAT_INSPECTOR) на Илия Спасов няма активно правило за съответствие. Той запазва основен достъп на член, докато не бъде създадено правило.',
      ),
      status: 'open',
      resolution: null,
      createdAt: created('sync-006', 1),
    },
    {
      id: 'exc-deacon-unmapped',
      jobId: 'sync-006',
      kind: 'unmapped_position',
      externalRef: 'REG-10544',
      details: lt(
        'The position “Senior Deacon” (CH_SENIOR_DEACON) held by Yavor Kanev has no active mapping rule. He keeps basic member access until a rule exists.',
        'Длъжността „Старши дякон“ (CH_SENIOR_DEACON) на Явор Кънев няма активно правило за съответствие. Той запазва основен достъп на член, докато не бъде създадено правило.',
      ),
      status: 'open',
      resolution: null,
      createdAt: created('sync-006', 1),
    },
    {
      id: 'exc-duplicate-plovdiv',
      jobId: 'sync-006',
      kind: 'duplicate_member',
      externalRef: 'REG-10587',
      details: lt(
        'Registry records REG-10587 and REG-10588 have the same name and date of birth (Plovdiv). Check whether they are the same person before importing them.',
        'Записите REG-10587 и REG-10588 в регистъра имат едно и също име и дата на раждане (Пловдив). Проверете дали става дума за един и същ човек, преди да ги импортирате.',
      ),
      status: 'open',
      resolution: null,
      createdAt: created('sync-006', 1),
    },
    {
      id: 'exc-unknown-chapter-ch07',
      jobId: 'sync-006',
      kind: 'unknown_chapter',
      externalRef: 'REG-10702',
      details: lt(
        'Record REG-10702 refers to chapter code CH-07, which is not configured in the portal.',
        'Записът REG-10702 се отнася за обител с код CH-07, която не е настроена в портала.',
      ),
      status: 'open',
      resolution: null,
      createdAt: created('sync-006', 1),
    },
    {
      id: 'exc-conflict-home-chapter',
      jobId: 'sync-006',
      kind: 'conflict',
      externalRef: 'REG-10607',
      details: lt(
        'The home chapter of Denis Stanev differs: the registry says Burgas, the portal says Varna. Choose which value to keep.',
        'Обителта на Денис Станев се различава: в регистъра е Бургас, а в портала – Варна. Изберете коя стойност да остане.',
      ),
      status: 'open',
      resolution: null,
      createdAt: created('sync-006', 1),
    },
    {
      id: 'exc-unknown-chapter-vt01',
      jobId: 'sync-002',
      kind: 'unknown_chapter',
      externalRef: 'REG-10690',
      details: lt(
        'Record REG-10690 refers to chapter code VT-01, which is not configured in the portal.',
        'Записът REG-10690 се отнася за обител с код VT-01, която не е настроена в портала.',
      ),
      status: 'resolved',
      resolution: {
        action: 'assign_chapter',
        note: 'VT-01 is the registry code of the Veliko Tarnovo chapter; linked it to Tsarevgrad Tarnov.',
        resolvedBy: 'u-admin',
        resolvedAt: at(ctx, -21, '10:15'),
        mappingId: null,
      },
      createdAt: created('sync-002', 1),
    },
    {
      id: 'exc-nmc-unmapped',
      jobId: 'sync-002',
      kind: 'unmapped_position',
      externalRef: 'REG-10655',
      details: lt(
        'The position “National Master Councilor” (NAT_MASTER_COUNCILOR) held by Petko Karaivanov has no active mapping rule.',
        'Длъжността „Национален съветник“ (NAT_MASTER_COUNCILOR) на Петко Караиванов няма активно правило за съответствие.',
      ),
      status: 'resolved',
      resolution: {
        action: 'map_position',
        note: 'Created a mapping to National Officer for the National Master Councilor.',
        resolvedBy: 'u-admin',
        resolvedAt: at(ctx, -21, '10:40'),
        mappingId: 'map-nat-master-councilor',
      },
      createdAt: created('sync-002', 1),
    },
    {
      id: 'exc-duplicate-twins',
      jobId: 'sync-002',
      kind: 'duplicate_member',
      externalRef: 'REG-10445',
      details: lt(
        'Registry records REG-10445 and REG-10446 have the same surname and date of birth (Sofia).',
        'Записите REG-10445 и REG-10446 в регистъра имат една и съща фамилия и дата на раждане (София).',
      ),
      status: 'ignored',
      resolution: {
        action: 'manual',
        note: 'Different people — twin brothers with the same date of birth. Both records are correct.',
        resolvedBy: 'u-admin',
        resolvedAt: at(ctx, -20, '09:30'),
        mappingId: null,
      },
      createdAt: created('sync-002', 1),
    },
  ];

  return { jobs, results, exceptions };
}
