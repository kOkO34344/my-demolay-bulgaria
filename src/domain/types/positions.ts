import type { Role, ScopeLevel, Scope } from './access';
import type { ID, ISODateTime, LocalizedText } from './common';

export const POSITION_LEVELS = ['chapter', 'national'] as const;
export type PositionLevel = (typeof POSITION_LEVELS)[number];

/**
 * An organizational position imported from the external member registry (simulated in the
 * prototype — always labelled "Imported position — demo data"). Members cannot edit it.
 */
export interface ImportedPosition {
  /** Stable registry code, e.g. "CH_SECRETARY". Mappings match on this code. */
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

/**
 * Rule: imported position code → application role at a scope level. Highest priority wins.
 * `role: null` means the office carries no application role (e.g. ritual offices): the holder gets
 * member-type access only. That is a valid outcome, unlike a code with no rule at all.
 */
export interface PositionRoleMapping {
  id: ID;
  positionCode: string;
  positionTitle: LocalizedText;
  role: Role | null;
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
  role: Role | null;
  scopeLevel: ScopeLevel;
  priority: number;
  active: boolean;
  notes: string;
}

/** Result of evaluating the mapping rules for a position code (no changes applied). */
export interface MappingPreview {
  positionCode: string;
  matchedMapping: PositionRoleMapping | null;
  /** Resulting role; null when unmapped (→ sync exception) or mapped to "no role". */
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
