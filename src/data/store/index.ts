/**
 * Mock data store (session-scoped). Used ONLY by mock repositories and test utilities — never by UI
 * code (enforced by ESLint). UI resets demo data through `useResetDemoData()`.
 */
export {
  Database,
  type DatabaseChange,
  type DatabaseListener,
  type DatabaseOptions,
} from './database';
export { db, resetDemoData } from './db';
export * from './schema';
export { simulateLatency, mockCall, setMockLatency } from './latency';
export {
  getSessionRecord,
  assignmentFor,
  subjectForSession,
  currentSubject,
  requireSubject,
  assertCan,
  assertAllowed,
} from './session';
export { appendAudit, type AuditInput } from './audit';
