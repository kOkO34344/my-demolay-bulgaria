import type { Role, ScopeLevel, Scope } from './access';
import type { ID, ISODateTime, LocalizedText } from './common';

export const POSITION_LEVELS = ['chapter', 'national'] as const;
export type PositionLevel = (typeof POSITION_LEVELS)[number];

/**
 * An organizational position imported from the external member registry (simulated in the
 * prototype — always labelled "Imported position — demo data"). Members cannot edit it.
 */
export interface ImportedPosition {
  /** Stable registry code, e.g. "CH_SCRIBE". Mappings match on this code. */
  code: string;
  title: LocalizedText;
  level: PositionLevel;
  /** Chapter the position belongs to (null for national positions). */
  chapterId: ID | null;
  /** Registry/source label, e.g. "Demo member registry". */
  source: string;
  /** Identifier of the member record in the external system. */
  externalId: string;
  importedAt: ISODateTime;
  isDemoData: boolean;
}

/** Rule: imported position code → application role at a scope level. Highest priority wins. */
export interface PositionRoleMapping {
  id: ID;
  positionCode: string;
  positionTitle: LocalizedText;
  role: Role;
  scopeLevel: ScopeLevel;
  /** Higher number = evaluated first. */
  priority: number;
  active: boolean;
  notes: string;
  updatedAt: ISODateTime;
  updatedBy: ID | null;
}

export interface PositionMappingInput {
  positionCode: string;
  positionTitle: LocalizedText;
  role: Role;
  scopeLevel: ScopeLevel;
  priority: number;
  active: boolean;
  notes: string;
}

/** Result of evaluating the mapping rules for a position code (no changes applied). */
export interface MappingPreview {
  positionCode: string;
  matchedMapping: PositionRoleMapping | null;
  /** Resulting role, or null when the position is unmapped (→ sync exception). */
  role: Role | null;
  scopeLevel: ScopeLevel | null;
  /** Example resolved scope for a member holding this position. */
  exampleScope: Scope | null;
  /** Members currently holding this position. */
  affectedMemberCount: number;
}

/** Distinct imported positions currently held by members (mapping administration). */
export interface ImportedPositionSummary {
  code: string;
  title: LocalizedText;
  level: PositionLevel;
  memberCount: number;
  /** Active mapping id, or null when unmapped. */
  mappingId: ID | null;
}
