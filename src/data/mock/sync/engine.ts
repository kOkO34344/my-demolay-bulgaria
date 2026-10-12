import { can } from '@/auth/policy';
import { ConflictError } from '@/data/errors';
import { appendAudit, db, type MemberRecord } from '@/data/store';
import type {
  ID,
  ImportedPosition,
  LocalizedText,
  PositionChange,
  RoleChange,
  Scope,
  Subject,
  SyncCounts,
  SyncException,
  SyncJob,
  SyncJobStatus,
  SyncStage,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { chapterName, msg } from '../helpers';
import { POSITION_SOURCE } from '../seed/demoAccounts';
import { positionDefinition } from '../seed/positions';
import { roleLabel, scopeLabel } from '../services/labels';
import { notifyUsers } from '../services/notify';
import { applyMappedRole } from '../services/roles';
import { activeUsersWhere } from '../services/subjects';

import { scenarioForRun } from './scenarios';

/**
 * Simulated synchronisation engine. A run moves through the stages
 *   queued → connecting → fetching → matching → mapping → applying → finalizing → done
 * over ~5 seconds. Progress is a pure function of the time elapsed since `startedAt`, so it is
 * robust to page reloads; timers only "tick" the store so polling hooks see each stage, and every
 * read endpoint reconciles first (`advanceDemoSyncs`). The result is deterministic per run number.
 */

const STAGE_PLAN: ReadonlyArray<{ stage: SyncStage; at: number; progress: number }> = [
  { stage: 'queued', at: 0, progress: 0 },
  { stage: 'connecting', at: 0.08, progress: 8 },
  { stage: 'fetching', at: 0.22, progress: 24 },
  { stage: 'matching', at: 0.4, progress: 42 },
  { stage: 'mapping', at: 0.56, progress: 60 },
  { stage: 'applying', at: 0.72, progress: 78 },
  { stage: 'finalizing', at: 0.88, progress: 93 },
];

export const DEFAULT_SYNC_DURATION_MS = 5_000;
let durationMs = DEFAULT_SYNC_DURATION_MS;
const timers = new Set<ReturnType<typeof setTimeout>>();

/** Tests: shorten/lengthen the simulated run. */
export function setDemoSyncDuration(ms: number | null): void {
  durationMs = ms === null ? DEFAULT_SYNC_DURATION_MS : Math.max(1, ms);
}

/** Tests / reset: drop pending ticks (the job still completes on the next read). */
export function cancelDemoSyncTimers(): void {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
}

export const isActiveSyncJob = (job: Pick<SyncJob, 'status'>): boolean =>
  job.status === 'queued' || job.status === 'running';

export const RUN_ID_PREFIX = 'sync-run-';

function runNumberOf(jobId: ID): number {
  const n = Number(jobId.slice(RUN_ID_PREFIX.length));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function stageAt(elapsedMs: number): { stage: SyncStage; progress: number } {
  let current = STAGE_PLAN[0] ?? { stage: 'queued' as const, progress: 0 };
  for (const step of STAGE_PLAN) if (elapsedMs >= step.at * durationMs) current = step;
  return current;
}

function schedule(): void {
  const ticks = [...STAGE_PLAN.map((s) => s.at * durationMs), durationMs].filter((t) => t > 0);
  for (const delay of ticks) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      advanceDemoSyncs();
    }, delay + 1);
    timers.add(timer);
  }
}

/** Starts a manual demo run (integration.manage is checked by the repository). */
export function startDemoSync(subject: Subject): SyncJob {
  advanceDemoSyncs();
  if (db.count('syncJobs', isActiveSyncJob) > 0) throw new ConflictError('messages.errors.syncRunning');
  const run = db.count('syncJobs', (j) => j.id.startsWith(RUN_ID_PREFIX)) + 1;
  const job: SyncJob = {
    id: `${RUN_ID_PREFIX}${run}`,
    status: 'queued',
    trigger: 'manual',
    triggeredBy: subject.userId,
    startedAt: clock.nowIso(),
    finishedAt: null,
    progress: 0,
    stage: 'queued',
  };
  db.transaction(() => {
    db.upsert('syncJobs', job);
    appendAudit(subject, {
      action: 'sync.started',
      entityType: 'sync_job',
      entityId: job.id,
      chapterId: null,
      summary: msg('messages.audit.syncStarted'),
      metadata: { run },
    });
  });
  schedule();
  return job;
}

/** Moves every running job to the stage matching the elapsed time; finishes completed ones. */
export function advanceDemoSyncs(now: Date = clock.now()): void {
  for (const job of db.find('syncJobs', isActiveSyncJob)) {
    const elapsed = now.getTime() - Date.parse(job.startedAt);
    if (elapsed >= durationMs) {
      finishJob(job, now);
      continue;
    }
    const { stage, progress } = stageAt(elapsed);
    const status: SyncJobStatus = stage === 'queued' ? 'queued' : 'running';
    if (job.stage !== stage || job.progress !== progress || job.status !== status) {
      db.update('syncJobs', job.id, { stage, progress, status });
    }
  }
}

function unmappedDetails(member: MemberRecord, position: ImportedPosition): LocalizedText {
  return {
    en: `The position “${position.title.en}” (${position.code}) held by ${member.displayName.en} has no active mapping rule. The member keeps basic member access until a rule exists.`,
    bg: `Длъжността „${position.title.bg}“ (${position.code}) на ${member.displayName.bg} няма активно правило за съответствие. Членът запазва основен достъп на член, докато не бъде създадено правило.`,
  };
}

function hasOpenException(kind: SyncException['kind'], externalRef: string): boolean {
  return (
    db.count('syncExceptions', (e) => e.status === 'open' && e.kind === kind && e.externalRef === externalRef) > 0
  );
}

function scopeText(scope: Scope): LocalizedText {
  return scopeLabel(scope, chapterName);
}

function finishJob(job: SyncJob, now: Date): void {
  const at = now.toISOString();
  const scenario = scenarioForRun(runNumberOf(job.id));
  db.transaction(() => {
    // 1. Apply the registry's position updates (imported positions are demo data).
    const positionChanges: PositionChange[] = [];
    for (const update of scenario.positionUpdates) {
      const member = db.get('members', update.userId);
      const definition = positionDefinition(update.code);
      if (!member || !definition || member.importedPosition?.code === update.code) continue;
      const position: ImportedPosition = {
        code: definition.code,
        title: definition.title,
        level: definition.level,
        chapterId: definition.level === 'chapter' ? member.chapterId : null,
        source: POSITION_SOURCE,
        externalId: member.importedPosition?.externalId ?? update.externalId,
        importedAt: at,
        isDemoData: true,
      };
      positionChanges.push({
        userId: member.userId,
        displayName: member.displayName,
        fromCode: member.importedPosition?.code ?? null,
        toCode: position.code,
        fromTitle: member.importedPosition?.title ?? null,
        toTitle: position.title,
      });
      db.update('members', member.userId, { importedPosition: position });
      notifyUsers([member.userId], {
        category: 'account',
        title: msg('messages.notifications.positionUpdated.title'),
        body: msg('messages.notifications.positionUpdated.body', { position: position.title }),
        link: { to: paths.profile(), entityType: 'member', entityId: member.userId },
        actorId: null,
      });
    }

    // 2. Refresh the imported-position metadata of every imported member.
    for (const member of db.find('members', (m) => m.importedPosition !== null)) {
      const position = member.importedPosition;
      if (position && position.importedAt !== at) {
        db.update('members', member.userId, { importedPosition: { ...position, importedAt: at } });
      }
    }

    // 3. Recalculate roles through the mappings (manual overrides are kept).
    const roleChanges: RoleChange[] = [];
    let newExceptions = 0;
    const imported = db.find('members', (m) => m.importedPosition !== null).sort((a, b) => a.userId.localeCompare(b.userId));
    for (const member of imported) {
      const { change, resolution } = applyMappedRole(member.userId, { at, actor: null });
      if (change) {
        roleChanges.push(change);
        appendAudit(null, {
          action: 'role.assigned',
          entityType: 'role_assignment',
          entityId: `ra-${member.userId}`,
          chapterId: member.chapterId,
          scope: 'system',
          summary: msg('messages.audit.roleSynced', {
            name: member.displayName,
            role: roleLabel(change.toRole ?? 'member'),
            scope: scopeText(change.scope ?? { level: 'chapter', chapterIds: [member.chapterId] }),
          }),
          metadata: { from: change.fromRole, to: change.toRole, mappingId: change.mappingId, jobId: job.id },
        });
      }
      const position = member.importedPosition;
      if (resolution.kind === 'unmapped' && position && !hasOpenException('unmapped_position', position.externalId)) {
        db.upsert('syncExceptions', {
          id: createId('exc'),
          jobId: job.id,
          kind: 'unmapped_position',
          externalRef: position.externalId,
          details: unmappedDetails(member, position),
          status: 'open',
          resolution: null,
          createdAt: at,
        });
        newExceptions += 1;
      }
    }
    for (const extra of scenario.exceptions) {
      if (hasOpenException(extra.kind, extra.externalRef)) continue;
      db.upsert('syncExceptions', {
        id: createId('exc'),
        jobId: job.id,
        kind: extra.kind,
        externalRef: extra.externalRef,
        details: extra.details,
        status: 'open',
        resolution: null,
        createdAt: at,
      });
      newExceptions += 1;
    }

    // 4. Result, counts and job status.
    const changedIds = new Set([...positionChanges.map((c) => c.userId), ...roleChanges.map((c) => c.userId)]);
    const importedNew = positionChanges.filter((c) => c.fromCode === null).length;
    const total = db.count('members', (m) => m.importedPosition !== null);
    const counts: SyncCounts = {
      imported: importedNew,
      updated: changedIds.size - importedNew,
      unchanged: Math.max(0, total - changedIds.size),
      deactivated: 0,
    };
    const status: SyncJobStatus = scenario.errors.length > 0 || newExceptions > 0 ? 'partial' : 'succeeded';
    db.upsert('syncResults', {
      id: job.id,
      jobId: job.id,
      counts,
      errors: scenario.errors,
      positionChanges,
      roleChanges,
    });
    db.update('syncJobs', job.id, { status, stage: 'done', progress: 100, finishedAt: at });

    // 5. Audit + notify administrators.
    const params = { updated: counts.updated + counts.imported, errors: scenario.errors.length, exceptions: newExceptions };
    appendAudit(null, {
      action: 'sync.completed',
      entityType: 'sync_job',
      entityId: job.id,
      chapterId: null,
      scope: 'system',
      summary: msg('messages.audit.syncCompleted', params),
      metadata: { status, scenario: scenario.key, ...params },
    });
    notifyUsers(
      activeUsersWhere((s) => can(s, 'integration.manage')),
      {
        category: 'system',
        title: msg(`messages.notifications.${status === 'succeeded' ? 'syncSucceeded' : 'syncPartial'}.title`),
        body: msg(`messages.notifications.${status === 'succeeded' ? 'syncSucceeded' : 'syncPartial'}.body`, params),
        link: { to: paths.adminSection('sync'), entityType: 'sync_job', entityId: job.id },
        actorId: null,
      },
    );
  });
}
