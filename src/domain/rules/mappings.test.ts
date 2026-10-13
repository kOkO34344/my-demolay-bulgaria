import { describe, expect, it } from 'vitest';

import type { ImportedPosition, PositionRoleMapping } from '@/domain';

import {
  assignmentNeedsUpdate,
  findMappingForPosition,
  previewPositionMapping,
  rankMappings,
  resolveMemberRole,
  scopeForMapping,
} from './mappings';

function mapping(overrides: Partial<PositionRoleMapping> & { id: string }): PositionRoleMapping {
  return {
    positionCode: 'CH_SECRETARY',
    positionTitle: { en: 'Secretary', bg: 'Секретар' },
    role: 'ch_sec',
    scopeLevel: 'chapter',
    priority: 100,
    active: true,
    notes: '',
    updatedAt: '2026-09-01T09:00:00.000Z',
    updatedBy: 'u-admin',
    ...overrides,
  };
}

function position(code: string, chapterId: string | null): ImportedPosition {
  return {
    code,
    title: { en: code, bg: code },
    level: chapterId ? 'chapter' : 'national',
    chapterId,
    source: 'Demo member registry (simulated)',
    externalId: 'REG-1',
    importedAt: '2026-10-01T03:00:00.000Z',
    isDemoData: true,
  };
}

const MAPPINGS: PositionRoleMapping[] = [
  mapping({ id: 'map-secretary' }),
  mapping({ id: 'map-secretary-legacy', role: null, priority: 500, active: false }),
  mapping({ id: 'map-secretary-low', role: null, priority: 10 }),
  mapping({
    id: 'map-chairman',
    positionCode: 'CH_CHAIRMAN',
    role: 'ch_chairman',
    priority: 200,
  }),
  mapping({
    id: 'map-nat',
    positionCode: 'NAT_COORDINATOR',
    role: 'nat_coord',
    scopeLevel: 'national',
  }),
  mapping({ id: 'map-chaplain', positionCode: 'CH_CHAPLAIN', role: null, priority: 50 }),
];

describe('mapping resolution', () => {
  it('ignores inactive mappings and ranks by priority', () => {
    expect(rankMappings('CH_SECRETARY', MAPPINGS).map((m) => m.id)).toEqual([
      'map-secretary',
      'map-secretary-low',
    ]);
    expect(findMappingForPosition('CH_SECRETARY', MAPPINGS)?.id).toBe('map-secretary');
  });

  it('breaks priority ties by the most recent update, then id', () => {
    const tied = [
      mapping({ id: 'b', priority: 50, updatedAt: '2026-09-01T00:00:00.000Z' }),
      mapping({ id: 'a', priority: 50, updatedAt: '2026-09-01T00:00:00.000Z' }),
      mapping({ id: 'c', priority: 50, updatedAt: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(rankMappings('CH_SECRETARY', tied).map((m) => m.id)).toEqual(['c', 'a', 'b']);
  });

  it('turns the scope level into a concrete scope', () => {
    expect(scopeForMapping('chapter', { chapterId: 'ch-2' }, 'ch-1')).toEqual({
      level: 'chapter',
      chapterIds: ['ch-2'],
    });
    expect(scopeForMapping('chapter', { chapterId: null }, 'ch-3')).toEqual({
      level: 'chapter',
      chapterIds: ['ch-3'],
    });
    expect(scopeForMapping('national', { chapterId: null }, 'ch-3')).toEqual({ level: 'national' });
    expect(scopeForMapping('system', null, 'ch-3')).toEqual({ level: 'system' });
  });

  it('maps chapter positions to a chapter scope and national positions to national scope', () => {
    expect(
      resolveMemberRole({
        position: position('CH_SECRETARY', 'ch-1'),
        homeChapterId: 'ch-1',
        mappings: MAPPINGS,
      }),
    ).toMatchObject({
      kind: 'mapped',
      role: 'ch_sec',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
      mapping: { id: 'map-secretary' },
    });
    expect(
      resolveMemberRole({
        position: position('NAT_COORDINATOR', null),
        homeChapterId: 'ch-2',
        mappings: MAPPINGS,
      }),
    ).toMatchObject({ kind: 'mapped', role: 'nat_coord', scope: { level: 'national' } });
  });

  it('reports unmapped positions (→ synchronisation exception) and members without one', () => {
    expect(
      resolveMemberRole({
        position: position('NAT_INSPECTOR', null),
        homeChapterId: 'ch-4',
        mappings: MAPPINGS,
      }),
    ).toEqual({ kind: 'unmapped', positionCode: 'NAT_INSPECTOR' });
    expect(
      resolveMemberRole({
        position: null,
        homeChapterId: 'ch-1',
        mappings: MAPPINGS,
      }),
    ).toEqual({ kind: 'no_position' });
  });

  it('treats a rule without a role as a valid "no role" outcome, not an exception', () => {
    expect(
      resolveMemberRole({
        position: position('CH_CHAPLAIN', 'ch-1'),
        homeChapterId: 'ch-1',
        mappings: MAPPINGS,
      }),
    ).toMatchObject({ kind: 'no_role', mapping: { id: 'map-chaplain' } });
  });

  it('detects whether a mapped assignment must change', () => {
    const scope = { level: 'chapter' as const, chapterIds: ['ch-1'] };
    const current = {
      role: 'ch_sec' as const,
      scope,
      mappingId: 'map-secretary',
      endedAt: null,
    };
    expect(assignmentNeedsUpdate(current, 'ch_sec', scope, 'map-secretary')).toBe(false);
    expect(assignmentNeedsUpdate(current, 'ch_jc', scope, 'map-secretary')).toBe(true);
    expect(
      assignmentNeedsUpdate(
        current,
        'ch_sec',
        { level: 'chapter', chapterIds: ['ch-2'] },
        'map-secretary',
      ),
    ).toBe(true);
    expect(assignmentNeedsUpdate(current, 'ch_sec', scope, 'map-other')).toBe(true);
    expect(
      assignmentNeedsUpdate(
        { ...current, endedAt: '2026-01-01T00:00:00.000Z' },
        'ch_sec',
        scope,
        'map-secretary',
      ),
    ).toBe(true);
    expect(assignmentNeedsUpdate(null, 'ch_sec', scope, 'map-secretary')).toBe(true);
  });

  it('previews a rule without applying it', () => {
    const holders = [
      { chapterId: 'ch-2', position: position('CH_CHAIRMAN', 'ch-2') },
      { chapterId: 'ch-1', position: position('CH_CHAIRMAN', 'ch-1') },
    ];
    expect(previewPositionMapping('CH_CHAIRMAN', MAPPINGS, holders, 'ch-9')).toMatchObject({
      positionCode: 'CH_CHAIRMAN',
      matchedMapping: { id: 'map-chairman' },
      role: 'ch_chairman',
      scopeLevel: 'chapter',
      exampleScope: { level: 'chapter', chapterIds: ['ch-2'] },
      affectedMemberCount: 2,
    });
    expect(previewPositionMapping('NAT_INSPECTOR', MAPPINGS, [], 'ch-1')).toMatchObject({
      matchedMapping: null,
      role: null,
      exampleScope: null,
      affectedMemberCount: 0,
    });
  });
});
