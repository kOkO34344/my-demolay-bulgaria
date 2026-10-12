import type {
  ID,
  IntegrationStatus,
  ResolveSyncExceptionInput,
  SyncException,
  SyncExceptionQuery,
  SyncJob,
  SyncJobDetail,
} from '@/domain';

/**
 * Simulated synchronisation with the external member registry (no live system is connected).
 * runDemoSync starts a job whose progress advances over time; poll getJob until finished.
 */
export interface SyncRepository {
  /** GET /api/v1/integration/status (integration.read) */
  getStatus(): Promise<IntegrationStatus>;

  /** GET /api/v1/integration/sync-jobs — newest first */
  listJobs(): Promise<SyncJob[]>;

  /** GET /api/v1/integration/sync-jobs/{job_id} — job + result + exceptions */
  getJob(jobId: ID): Promise<SyncJobDetail>;

  /** POST /api/v1/integration/sync-jobs (integration.manage) — @throws ConflictError if a job is running */
  runDemoSync(): Promise<SyncJob>;

  /** GET /api/v1/integration/exceptions?status=&kind=&job_id= */
  listExceptions(query?: SyncExceptionQuery): Promise<SyncException[]>;

  /** POST /api/v1/integration/exceptions/{id}/resolve */
  resolveException(id: ID, input: ResolveSyncExceptionInput): Promise<SyncException>;

  /** POST /api/v1/integration/exceptions/{id}/ignore { note } */
  ignoreException(id: ID, note: string): Promise<SyncException>;
}
