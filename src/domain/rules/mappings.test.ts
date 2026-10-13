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
    positionCode: 'CH_SCRIBE',
    positionTitle: { en: 'Secretary', bg: 'Секретар' },
    role: 'chapter_officer',
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
  mapping({ id: 'map-scribe' }),
  mapping({ id: 'map-scribe-legacy', role: 'member', priority: 500, active: false }),
  mapping({ id: 'map-scribe-low', role: 'member', priority: 10 }),
  mapping({
    id: 'map-advisor',
    positionCode: 'CH_ADVISOR',
    role: 'chapter_advisor',
    priority: 200,
  }),
  mapping({
    id: 'map-nat',
    positionCode: 'NAT_PROGRAMME_COORDINATOR',
    role: 'national_officer',
    scopeLevel: 'national',
  }),
];

describe('mapping resolution', () => {
  it('ignores inactive mappings and ranks by priority', () => {
    expect(rankMappings('CH_SCRIBE', MAPPINGS).map((m) => m.id)).toEqual([
      'map-scribe',
      'map-scribe-low',
    ]);
    expect(findMappingForPosition('CH_SCRIBE', MAPPINGS)?.id).toBe('map-scribe');
  });

  it('breaks priority ties by the most recent update, then id', () => {
    const tied = [
      mapping({ id: 'b', priority: 50, updatedAt: '2026-09-01T00:00:00.000Z' }),
      mapping({ id: 'a', priority: 50, updatedAt: '2026-09-01T00:00:00.000Z' }),
      mapping({ id: 'c', priority: 50, updatedAt: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(rankMappings('CH_SCRIBE', tied).map((m) => m.id)).toEqual(['c', 'a', 'b']);
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
        position: position('CH_SCRIBE', 'ch-1'),
        homeChapterId: 'ch-1',
        mappings: MAPPINGS,
        current: null,
      }),
    ).toMatchObject({
      kind: 'mapped',
      role: 'chapter_officer',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
      mapping: { id: 'map-scribe' },
    });
    expect(
      resolveMemberRole({
        position: position('NAT_PROGRAMME_COORDINATOR', null),
        homeChapterId: 'ch-2',
        mappings: MAPPINGS,
        current: null,
      }),
    ).toMatchObject({ kind: 'mapped', role: 'national_officer', scope: { level: 'national' } });
  });

  it('reports unmapped positions (→ synchronisation exception) and members without one', () => {
    expect(
      resolveMemberRole({
        position: position('NAT_INSPECTOR', null),
        homeChapterId: 'ch-4',
        mappings: MAPPINGS,
        current: null,
      }),
    ).toEqual({ kind: 'unmapped', positionCode: 'NAT_INSPECTOR' });
    expect(
      resolveMemberRole({
        position: null,
        homeChapterId: 'ch-1',
        mappings: MAPPINGS,
        current: null,
      }),
    ).toEqual({ kind: 'no_position' });
  });

  it('gives a manual assignment precedence over every mapping', () => {
    const result = resolveMemberRole({
      position: position('CH_SCRIBE', 'ch-3'),
      homeChapterId: 'ch-3',
      mappings: MAPPINGS,
      current: {
        id: 'ra-u-v03',
        role: 'chapter_advisor',
        scope: { level: 'multi_chapter', chapterIds: ['ch-1', 'ch-3'] },
        source: 'manual',
      },
    });
    expect(result).toEqual({
      kind: 'manual_override',
      role: 'chapter_advisor',
      scope: { level: 'multi_chapter', chapterIds: ['ch-1', 'ch-3'] },
      assignmentId: 'ra-u-v03',
    });
  });

  it('detects whether a mapped assignment must change', () => {
    const scope = { level: 'chapter' as const, chapterIds: ['ch-1'] };
    const current = {
      role: 'chapter_officer' as const,
      scope,
      source: 'mapping' as const,
      mappingId: 'map-scribe',
    };
    expect(assignmentNeedsUpdate(current, 'chapter_officer', scope, 'map-scribe')).toBe(false);
    expect(assignmentNeedsUpdate(current, 'member', scope, 'map-scribe')).toBe(true);
    expect(
      assignmentNeedsUpdate(
        current,
        'chapter_officer',
        { level: 'chapter', chapterIds: ['ch-2'] },
        'map-scribe',
      ),
    ).toBe(true);
    expect(assignmentNeedsUpdate(current, 'chapter_officer', scope, 'map-other')).toBe(true);
    expect(assignmentNeedsUpdate(null, 'member', scope, 'map-scribe')).toBe(true);
  });

  it('previews a rule without applying it', () => {
    const holders = [
      { chapterId: 'ch-2', position: position('CH_ADVISOR', 'ch-2') },
      { chapterId: 'ch-1', position: position('CH_ADVISOR', 'ch-1') },
    ];
    expect(previewPositionMapping('CH_ADVISOR', MAPPINGS, holders, 'ch-9')).toMatchObject({
      positionCode: 'CH_ADVISOR',
      matchedMapping: { id: 'map-advisor' },
      role: 'chapter_advisor',
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
