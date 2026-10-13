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
 *  - a mapping with `role: null` means the office carries no application role (valid);
 *  - a position with no active mapping is "unmapped" → a synchronisation exception;
 *  - the mapping manages only the member's position-derived assignment (`ra-<userId>-pos`).
 *    Roles assigned manually by a system administrator are separate and never touched.
 */

/** Id of the assignment derived from a member's imported position. */
export const positionAssignmentId = (userId: ID): ID => `ra-${userId}-pos`;

/** Id of a manual assignment (one per user and role). */
export const manualAssignmentId = (userId: ID, role: Role): ID => `ra-${userId}-${role}`;

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
  | { kind: 'mapped'; role: Role; scope: Scope; mapping: PositionRoleMapping }
  | { kind: 'no_role'; mapping: PositionRoleMapping }
  | { kind: 'unmapped'; positionCode: string }
  | { kind: 'no_position' };

export interface RoleResolutionInput {
  position: ImportedPosition | null;
  homeChapterId: ID;
  mappings: readonly PositionRoleMapping[];
}

/** Resolves the role a member's imported position yields (mapping → no role → unmapped). */
export function resolveMemberRole(input: RoleResolutionInput): RoleResolution {
  const { position, homeChapterId, mappings } = input;
  if (!position) return { kind: 'no_position' };
  const mapping = findMappingForPosition(position.code, mappings);
  if (!mapping) return { kind: 'unmapped', positionCode: position.code };
  if (mapping.role === null) return { kind: 'no_role', mapping };
  return {
    kind: 'mapped',
    role: mapping.role,
    scope: scopeForMapping(mapping.scopeLevel, position, homeChapterId),
    mapping,
  };
}

/** Does the current position assignment differ from the resolved role/scope/mapping? */
export function assignmentNeedsUpdate(
  current: Pick<RoleAssignment, 'role' | 'scope' | 'mappingId' | 'endedAt'> | null,
  role: Role,
  scope: Scope,
  mappingId: ID,
): boolean {
  if (!current || current.endedAt !== null) return true;
  return (
    current.role !== role || !scopesEqual(current.scope, scope) || current.mappingId !== mappingId
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
    scopeLevel: matched?.role ? matched.scopeLevel : null,
    exampleScope: matched?.role
      ? scopeForMapping(
          matched.scopeLevel,
          example?.position ?? null,
          example?.chapterId ?? fallbackChapterId,
        )
      : null,
    affectedMemberCount: holders.length,
  };
}
