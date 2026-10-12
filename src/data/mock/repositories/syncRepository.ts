import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { SyncRepository } from '@/data/repositories';
import { appendAudit, assertCan, db, mockCall, requireSubject } from '@/data/store';
import { ignoreSyncExceptionSchema, resolveSyncExceptionSchema } from '@/domain/schemas';
import type {
  IntegrationStatus,
  SyncException,
  SyncExceptionResolution,
  SyncJob,
  SyncJobDetail,
} from '@/domain';
import { clock } from '@/lib/clock';

import { chapterName, msg, validateInput } from '../helpers';
import { roleLabel, scopeLabel } from '../services/labels';
import { applyMappedRole } from '../services/roles';
import { advanceDemoSyncs, isActiveSyncJob, startDemoSync } from '../sync/engine';

/**
 * Simulated synchronisation with the external member registry (no live system is connected:
 * `connected` is always false). Reads reconcile running jobs first so polling sees progress.
 */

const newestFirst = (a: SyncJob, b: SyncJob): number =>
  b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id);

function openException(id: string): SyncException {
  const exception = db.get('syncExceptions', id);
  if (!exception) throw new NotFoundError('sync_exception', id);
  if (exception.status !== 'open') throw new ConflictError('messages.errors.exceptionClosed');
  return exception;
}

export function createMockSyncRepository(): SyncRepository {
  return {
    getStatus: () =>
      mockCall((): IntegrationStatus => {
        const subject = requireSubject();
        assertCan(subject, 'integration.read');
        advanceDemoSyncs();
        const jobs = db.list('syncJobs').sort(newestFirst);
        const lastFinished = jobs.find((j) => !isActiveSyncJob(j) && j.finishedAt);
        const config = db.getMeta('integration');
        return {
          connected: false,
          mode: 'demo',
          providerLabel: config.providerLabel,
          lastSyncAt: lastFinished?.finishedAt ?? null,
          lastSyncStatus: jobs[0]?.status ?? null,
          nextScheduledAt: config.nextScheduledAt,
          importedMemberCount: db.count('members', (m) => m.importedPosition !== null),
          openExceptionCount: db.count('syncExceptions', (e) => e.status === 'open'),
        };
      }),

    listJobs: () =>
      mockCall((): SyncJob[] => {
        const subject = requireSubject();
        assertCan(subject, 'integration.read');
        advanceDemoSyncs();
        return db.list('syncJobs').sort(newestFirst);
      }),

    getJob: (jobId) =>
      mockCall((): SyncJobDetail => {
        const subject = requireSubject();
        assertCan(subject, 'integration.read');
        advanceDemoSyncs();
        const job = db.get('syncJobs', jobId);
        if (!job) throw new NotFoundError('sync_job', jobId);
        const result = db.get('syncResults', jobId);
        let resultView: SyncJobDetail['result'] = null;
        if (result) {
          const { id: _id, ...rest } = result;
          resultView = rest;
        }
        return {
          job,
          result: resultView,
          exceptions: db
            .find('syncExceptions', (e) => e.jobId === jobId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
        };
      }),

    runDemoSync: () =>
      mockCall((): SyncJob => {
        const subject = requireSubject();
        assertCan(subject, 'integration.manage');
        return startDemoSync(subject);
      }),

    listExceptions: (query = {}) =>
      mockCall((): SyncException[] => {
        const subject = requireSubject();
        assertCan(subject, 'integration.read');
        advanceDemoSyncs();
        return db
          .list('syncExceptions')
          .filter((e) => !query.status || query.status === 'all' || e.status === query.status)
          .filter((e) => !query.kind || query.kind === 'all' || e.kind === query.kind)
          .filter((e) => !query.jobId || e.jobId === query.jobId)
          .sort(
            (a, b) =>
              Number(b.status === 'open') - Number(a.status === 'open') ||
              b.createdAt.localeCompare(a.createdAt) ||
              a.id.localeCompare(b.id),
          );
      }),

    resolveException: (id, input) =>
      mockCall((): SyncException => {
        const subject = requireSubject();
        assertCan(subject, 'integration.manage');
        const exception = openException(id);
        const data = validateInput(resolveSyncExceptionSchema, input);
        const holders = db.find('members', (m) => m.importedPosition?.externalId === exception.externalRef);
        if (data.action === 'map_position') {
          const mapping = data.mappingId ? db.get('positionMappings', data.mappingId) : undefined;
          const codes = new Set(holders.map((m) => m.importedPosition?.code));
          const matches =
            !!mapping &&
            mapping.active &&
            (exception.kind !== 'unmapped_position' || codes.has(mapping.positionCode));
          if (!matches) throw new ValidationError({ mappingId: 'messages.errors.mappingMismatch' });
        } else if (data.action === 'map_position') {
          throw new ForbiddenError('invalid_transition');
        }
        const now = clock.nowIso();
        const resolution: SyncExceptionResolution = {
          action: data.action,
          note: data.note,
          resolvedBy: subject.userId,
          resolvedAt: now,
          mappingId: data.action === 'map_position' ? (data.mappingId ?? null) : null,
        };
        const resolved: SyncException = { ...exception, status: 'resolved', resolution };
        db.transaction(() => {
          db.upsert('syncExceptions', resolved);
          if (data.action === 'map_position') {
            // Apply the chosen mapping right away to the member(s) behind the exception.
            for (const member of holders) {
              const { change } = applyMappedRole(member.userId, { at: now, actor: subject });
              if (!change) continue;
              appendAudit(subject, {
                action: 'role.assigned',
                entityType: 'role_assignment',
                entityId: `ra-${member.userId}`,
                chapterId: member.chapterId,
                summary: msg('messages.audit.roleSynced', {
                  name: member.displayName,
                  role: roleLabel(change.toRole ?? 'member'),
                  scope: scopeLabel(
                    change.scope ?? { level: 'chapter', chapterIds: [member.chapterId] },
                    chapterName,
                  ),
                }),
                metadata: { from: change.fromRole, to: change.toRole, mappingId: change.mappingId },
              });
            }
          }
          appendAudit(subject, {
            action: 'sync.exception_resolved',
            entityType: 'sync_exception',
            entityId: id,
            chapterId: null,
            summary: msg('messages.audit.exceptionResolved', {
              ref: exception.externalRef,
              note: data.note,
            }),
            metadata: { kind: exception.kind, action: data.action, mappingId: resolution.mappingId },
          });
        });
        return resolved;
      }),

    ignoreException: (id, note) =>
      mockCall((): SyncException => {
        const subject = requireSubject();
        assertCan(subject, 'integration.manage');
        const exception = openException(id);
        const data = validateInput(ignoreSyncExceptionSchema, { note });
        const ignored: SyncException = {
          ...exception,
          status: 'ignored',
          resolution: {
            action: 'manual',
            note: data.note,
            resolvedBy: subject.userId,
            resolvedAt: clock.nowIso(),
            mappingId: null,
          },
        };
        db.transaction(() => {
          db.upsert('syncExceptions', ignored);
          appendAudit(subject, {
            action: 'sync.exception_ignored',
            entityType: 'sync_exception',
            entityId: id,
            chapterId: null,
            summary: msg('messages.audit.exceptionIgnored', {
              ref: exception.externalRef,
              note: data.note,
            }),
            metadata: { kind: exception.kind },
          });
        });
        return ignored;
      }),
  };
}
