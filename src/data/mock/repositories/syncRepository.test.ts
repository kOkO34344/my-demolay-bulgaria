import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConflictError, ForbiddenError, type ValidationError } from '@/data/errors';
import { db } from '@/data/store';

import { SEED_IDS } from '../seed';
import {
  cancelDemoSyncTimers,
  DEFAULT_SYNC_DURATION_MS,
  setDemoSyncDuration,
} from '../sync/engine';
import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockRoleRepository } from './roleRepository';
import { createMockSyncRepository } from './syncRepository';

const sync = createMockSyncRepository();
const roles = createMockRoleRepository();
const X = SEED_IDS.sync;

describe('sync repository — access and status', () => {
  it('only administrators read or run the integration', async () => {
    signInAs('active_member');
    await expect(sync.getStatus()).rejects.toBeInstanceOf(ForbiddenError);
    signInAs('national_coordinator');
    await expect(sync.listJobs()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(sync.runDemoSync()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('reports a simulated, disconnected integration with the seeded history', async () => {
    signInAs('sysadmin');
    const status = await sync.getStatus();
    expect(status).toMatchObject({
      connected: false,
      mode: 'demo',
      providerLabel: 'Demo member registry (simulated)',
      lastSyncStatus: 'partial',
      openExceptionCount: 5,
    });
    expect(status.importedMemberCount).toBe(
      db.count('members', (m) => m.importedPosition !== null),
    );
    const jobs = await sync.listJobs();
    expect(jobs.map((j) => j.id)[0]).toBe(X.latestJob);
    expect(new Set(jobs.map((j) => j.status))).toEqual(new Set(['succeeded', 'partial', 'failed']));
    const failed = await sync.getJob(X.failedJob);
    expect(failed.job.status).toBe('failed');
    const latest = await sync.getJob(X.latestJob);
    expect(latest.result?.counts).toBeDefined();
    expect(latest.exceptions.length).toBeGreaterThan(0);
  });

  it('filters exceptions by status and kind', async () => {
    signInAs('sysadmin');
    const open = await sync.listExceptions({ status: 'open' });
    expect(open).toHaveLength(5);
    const unmapped = await sync.listExceptions({ status: 'all', kind: 'unmapped_position' });
    expect(unmapped.every((e) => e.kind === 'unmapped_position')).toBe(true);
    expect((await sync.listExceptions())[0]?.status).toBe('open');
  });
});

describe('sync repository — demo run lifecycle (fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T09:00:00.000Z'));
  });

  afterEach(() => {
    cancelDemoSyncTimers();
    setDemoSyncDuration(null);
    vi.useRealTimers();
  });

  it('advances through the stages over ~5 s and applies the registry changes', async () => {
    signInAs('sysadmin');
    const adminBefore = notificationsOf('u-admin').length;
    const job = await sync.runDemoSync();
    expect(job).toMatchObject({ id: 'sync-run-1', status: 'queued', stage: 'queued', progress: 0 });
    expect(auditEntries('sync.started', job.id)).toHaveLength(1);
    await expect(sync.runDemoSync()).rejects.toMatchObject({
      reasonKey: 'messages.errors.syncRunning',
    });

    // Timers tick the store, so polling clients see each stage without reading first.
    vi.advanceTimersByTime(1_500);
    expect(db.require('syncJobs', job.id)).toMatchObject({ status: 'running', stage: 'fetching' });
    vi.advanceTimersByTime(1_500);
    const midway = await sync.getJob(job.id);
    expect(midway.job.stage).toBe('mapping');
    expect(midway.job.progress).toBeGreaterThan(40);
    expect(midway.result).toBeNull();

    vi.advanceTimersByTime(DEFAULT_SYNC_DURATION_MS);
    const done = await sync.getJob(job.id);
    expect(done.job).toMatchObject({ status: 'partial', stage: 'done', progress: 100 });
    expect(done.result?.errors).toHaveLength(1);
    expect(done.result?.positionChanges.map((c) => c.userId).sort()).toEqual(
      ['u-s11', 'u-t03', 'u-v03'].sort(),
    );
    expect(done.result?.roleChanges).toEqual([
      expect.objectContaining({ userId: 'u-t03', fromRole: null, toRole: 'ch_treas' }),
      expect.objectContaining({ userId: 'u-v03', fromRole: null, toRole: 'ch_sec' }),
    ]);
    expect(done.result?.counts).toMatchObject({ imported: 1, updated: 2 });
    expect(done.exceptions).toEqual([
      expect.objectContaining({ kind: 'unmapped_position', status: 'open' }),
    ]);

    // Manual role kept next to the new position role; importedAt refreshed.
    expect(db.require('roleAssignments', 'ra-u-v03-ch_sec')).toMatchObject({
      source: 'manual',
      role: 'ch_sec',
      endedAt: null,
    });
    expect(db.require('roleAssignments', 'ra-u-v03-pos')).toMatchObject({
      source: 'mapping',
      role: 'ch_sec',
    });
    expect(db.require('roleAssignments', 'ra-u-t03-pos')).toMatchObject({
      role: 'ch_treas',
      mappingId: 'map-ch-treasurer',
    });
    expect(db.require('members', 'u-s01').importedPosition?.importedAt).toBe(done.job.finishedAt);

    // Side effects: audit + notifications.
    expect(auditEntries('sync.completed', job.id)).toHaveLength(1);
    expect(auditEntries('role.assigned', 'ra-u-t03-pos')).toHaveLength(1);
    expect(notificationsOf('u-admin')).toHaveLength(adminBefore + 1);
    expect(notificationsOf('u-admin')[0]).toMatchObject({
      category: 'system',
      link: { to: '/admin/sync', entityType: 'sync_job', entityId: job.id },
    });
    expect(notificationsOf('u-t03').map((n) => n.category)).toEqual(
      expect.arrayContaining(['account']),
    );
    const status = await sync.getStatus();
    expect(status).toMatchObject({ lastSyncStatus: 'partial', openExceptionCount: 6 });
    expect(status.lastSyncAt).toBe(done.job.finishedAt);
  });

  it('is deterministic per run number and settles into "no changes"', async () => {
    setDemoSyncDuration(100);
    signInAs('sysadmin');
    const results: string[] = [];
    for (let run = 1; run <= 4; run += 1) {
      const job = await sync.runDemoSync();
      expect(job.id).toBe(`sync-run-${run}`);
      vi.advanceTimersByTime(150);
      const detail = await sync.getJob(job.id);
      results.push(`${detail.job.status}:${detail.result?.positionChanges.length ?? -1}`);
    }
    // A: partial (3 position changes) · B: succeeded (2) · C: succeeded (0) · A again: no changes.
    expect(results).toEqual(['partial:3', 'succeeded:2', 'succeeded:0', 'partial:0']);
  });

  it('completes on the next read even if the timers were dropped (e.g. after a reload)', async () => {
    signInAs('sysadmin');
    const job = await sync.runDemoSync();
    cancelDemoSyncTimers();
    vi.setSystemTime(new Date(Date.now() + DEFAULT_SYNC_DURATION_MS + 10));
    expect((await sync.listJobs())[0]).toMatchObject({ id: job.id, stage: 'done' });
  });
});

describe('sync repository — exceptions queue', () => {
  it('resolves an unmapped position by mapping it and applies the role', async () => {
    signInAs('sysadmin');
    const mapping = await roles.createMapping({
      positionCode: 'CH_SENIOR_DEACON',
      positionTitle: { en: 'Senior Deacon', bg: 'Старши дякон' },
      role: null,
      scopeLevel: 'chapter',
      priority: 50,
      active: true,
      notes: '',
    });
    const resolved = await sync.resolveException('exc-deacon-unmapped', {
      action: 'map_position',
      note: 'Ritual office — member access is enough.',
      mappingId: mapping.id,
    });
    expect(resolved).toMatchObject({
      status: 'resolved',
      resolution: { action: 'map_position', mappingId: mapping.id, resolvedBy: 'u-admin' },
    });
    // "No role" is a valid outcome: the deacon keeps member-type access only.
    expect(db.get('roleAssignments', 'ra-u-p05-pos')).toBeUndefined();
    expect(auditEntries('sync.exception_resolved', 'exc-deacon-unmapped')).toHaveLength(1);
    await expect(
      sync.resolveException('exc-deacon-unmapped', { action: 'manual', note: 'again' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('validates the resolution and records ignored exceptions', async () => {
    signInAs('sysadmin');
    const mismatch = await sync
      .resolveException(X.openUnmappedException, {
        action: 'map_position',
        note: 'Wrong rule',
        mappingId: 'map-ch-secretary',
      })
      .catch((e: unknown) => e);
    expect((mismatch as ValidationError).fieldErrors).toEqual({
      mappingId: 'messages.errors.mappingMismatch',
    });
    const missingMapping = await sync
      .resolveException(X.openUnmappedException, { action: 'map_position', note: 'No rule' })
      .catch((e: unknown) => e);
    expect((missingMapping as ValidationError).fieldErrors).toEqual({
      mappingId: 'validation.selectOption',
    });
    const ignored = await sync.ignoreException(X.openConflictException, 'Handled offline.');
    expect(ignored).toMatchObject({ status: 'ignored', resolution: { note: 'Handled offline.' } });
    expect(auditEntries('sync.exception_ignored', X.openConflictException)).toHaveLength(1);
    expect((await sync.getStatus()).openExceptionCount).toBe(4);
  });
});
