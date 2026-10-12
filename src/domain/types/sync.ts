import type { Role, Scope } from './access';
import type { ID, ISODateTime, LocalizedText } from './common';

/**
 * Simulated synchronisation with the external member-data system:
 *   External member source → Imported organizational position → Position-to-role mapping
 *   → Application role → Permissions and scope
 */

export const SYNC_JOB_STATUSES = ['queued', 'running', 'succeeded', 'partial', 'failed'] as const;
export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[number];

export const SYNC_STAGES = [
  'queued',
  'connecting',
  'fetching',
  'matching',
  'mapping',
  'applying',
  'finalizing',
  'done',
] as const;
export type SyncStage = (typeof SYNC_STAGES)[number];

export const SYNC_TRIGGERS = ['manual', 'scheduled'] as const;
export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];

export interface SyncJob {
  id: ID;
  status: SyncJobStatus;
  trigger: SyncTrigger;
  /** null for scheduled jobs. */
  triggeredBy: ID | null;
  startedAt: ISODateTime;
  finishedAt: ISODateTime | null;
  /** 0–100 */
  progress: number;
  stage: SyncStage;
}

export interface SyncCounts {
  imported: number;
  updated: number;
  unchanged: number;
  deactivated: number;
}

export interface SyncError {
  externalRef: string;
  message: LocalizedText;
}

export interface PositionChange {
  userId: ID;
  displayName: LocalizedText;
  fromCode: string | null;
  toCode: string | null;
  fromTitle: LocalizedText | null;
  toTitle: LocalizedText | null;
}

export interface RoleChange {
  userId: ID;
  displayName: LocalizedText;
  fromRole: Role | null;
  toRole: Role | null;
  scope: Scope | null;
  mappingId: ID | null;
}

export interface SyncResult {
  jobId: ID;
  counts: SyncCounts;
  errors: SyncError[];
  positionChanges: PositionChange[];
  roleChanges: RoleChange[];
}

export const SYNC_EXCEPTION_KINDS = [
  'unmapped_position',
  'duplicate_member',
  'unknown_chapter',
  'conflict',
] as const;
export type SyncExceptionKind = (typeof SYNC_EXCEPTION_KINDS)[number];

export const SYNC_EXCEPTION_STATUSES = ['open', 'resolved', 'ignored'] as const;
export type SyncExceptionStatus = (typeof SYNC_EXCEPTION_STATUSES)[number];

export const SYNC_RESOLUTION_ACTIONS = [
  'map_position',
  'merge_records',
  'assign_chapter',
  'accept_external',
  'keep_local',
  'manual',
] as const;
export type SyncResolutionAction = (typeof SYNC_RESOLUTION_ACTIONS)[number];

export interface SyncExceptionResolution {
  action: SyncResolutionAction;
  note: string;
  resolvedBy: ID;
  resolvedAt: ISODateTime;
  mappingId: ID | null;
}

export interface SyncException {
  id: ID;
  jobId: ID;
  kind: SyncExceptionKind;
  /** Reference in the external system, e.g. "REG-10432". */
  externalRef: string;
  details: LocalizedText;
  status: SyncExceptionStatus;
  resolution: SyncExceptionResolution | null;
  createdAt: ISODateTime;
}

export interface SyncJobDetail {
  job: SyncJob;
  result: SyncResult | null;
  exceptions: SyncException[];
}

/** Integration health. In the prototype `connected` is always false (no live system). */
export interface IntegrationStatus {
  connected: boolean;
  mode: 'demo' | 'live';
  providerLabel: string;
  lastSyncAt: ISODateTime | null;
  lastSyncStatus: SyncJobStatus | null;
  nextScheduledAt: ISODateTime | null;
  importedMemberCount: number;
  openExceptionCount: number;
}

export interface SyncExceptionQuery {
  status?: SyncExceptionStatus | 'all';
  kind?: SyncExceptionKind | 'all';
  jobId?: ID;
}

export interface ResolveSyncExceptionInput {
  action: SyncResolutionAction;
  note: string;
  mappingId?: ID | null;
}
