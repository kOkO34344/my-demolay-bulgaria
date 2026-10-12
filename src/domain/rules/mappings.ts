import { scopesEqual } from '@/auth/scope';
import type {
  ID,
  ImportedPosition,
  MappingPreview,
  PositionRoleMapping,
  Role,
  RoleAssignment,
  Scope,
  ScopeLevel,
} from '@/domain';

/**
 * Position-to-role mapping (simulated synchronisation pipeline):
 *   External member source → Imported position → Position-to-role mapping → Application role → Scope
 * Rules:
 *  - only ACTIVE mappings for the exact position code are considered; the highest priority wins
 *    (ties: most recently updated, then id — deterministic);
 *  - the scope comes from the mapping's scope level: chapter-level → the position's chapter
 *    (or the member's home chapter for national positions); national / system as is;
 *  - a MANUAL role assignment always takes precedence over mappings (sync keeps it);
 *  - a position with no active mapping is "unmapped" → a synchronisation exception.
 */

/** Active mappings for a code, best first. */
export function rankMappings(
  positionCode: string,
  mappings: readonly PositionRoleMapping[],
): PositionRoleMapping[] {
  return mappings
    .filter((m) => m.active && m.positionCode === positionCode)
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id),
    );
}

export function findMappingForPosition(
  positionCode: string,
  mappings: readonly PositionRoleMapping[],
): PositionRoleMapping | null {
  return rankMappings(positionCode, mappings)[0] ?? null;
}

/** Concrete scope for a member matched by a mapping. */
export function scopeForMapping(
  scopeLevel: ScopeLevel,
  position: Pick<ImportedPosition, 'chapterId'> | null,
  homeChapterId: ID,
): Scope {
  switch (scopeLevel) {
    case 'chapter':
    case 'multi_chapter':
      return { level: scopeLevel, chapterIds: [position?.chapterId ?? homeChapterId] };
    case 'national':
      return { level: 'national' };
    case 'system':
      return { level: 'system' };
    case 'self':
      return { level: 'self' };
  }
}

export type RoleResolution =
  | { kind: 'manual_override'; role: Role; scope: Scope; assignmentId: ID }
  | { kind: 'mapped'; role: Role; scope: Scope; mapping: PositionRoleMapping }
  | { kind: 'unmapped'; positionCode: string }
  | { kind: 'no_position' };

export interface RoleResolutionInput {
  position: ImportedPosition | null;
  homeChapterId: ID;
  mappings: readonly PositionRoleMapping[];
  current: Pick<RoleAssignment, 'id' | 'role' | 'scope' | 'source'> | null;
}

/** Resolves the application role a member should hold (manual override → mapping → unmapped). */
export function resolveMemberRole(input: RoleResolutionInput): RoleResolution {
  const { position, homeChapterId, mappings, current } = input;
  if (current?.source === 'manual') {
    return {
      kind: 'manual_override',
      role: current.role,
      scope: current.scope,
      assignmentId: current.id,
    };
  }
  if (!position) return { kind: 'no_position' };
  const mapping = findMappingForPosition(position.code, mappings);
  if (!mapping) return { kind: 'unmapped', positionCode: position.code };
  return {
    kind: 'mapped',
    role: mapping.role,
    scope: scopeForMapping(mapping.scopeLevel, position, homeChapterId),
    mapping,
  };
}

/** Does the current assignment differ from the resolved role/scope/mapping? */
export function assignmentNeedsUpdate(
  current: Pick<RoleAssignment, 'role' | 'scope' | 'source' | 'mappingId'> | null,
  role: Role,
  scope: Scope,
  mappingId: ID,
): boolean {
  if (!current) return true;
  return (
    current.role !== role ||
    !scopesEqual(current.scope, scope) ||
    current.source !== 'mapping' ||
    current.mappingId !== mappingId
  );
}

/** Evaluates the rules for a code without applying them (mapping administration preview). */
export function previewPositionMapping(
  positionCode: string,
  mappings: readonly PositionRoleMapping[],
  holders: ReadonlyArray<{ chapterId: ID; position: Pick<ImportedPosition, 'chapterId'> | null }>,
  fallbackChapterId: ID,
): MappingPreview {
  const matched = findMappingForPosition(positionCode, mappings);
  const example = holders[0];
  return {
    positionCode,
    matchedMapping: matched,
    role: matched?.role ?? null,
    scopeLevel: matched?.scopeLevel ?? null,
    exampleScope: matched
      ? scopeForMapping(
          matched.scopeLevel,
          example?.position ?? null,
          example?.chapterId ?? fallbackChapterId,
        )
      : null,
    affectedMemberCount: holders.length,
  };
}
