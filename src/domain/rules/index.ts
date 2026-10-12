/**
 * Pure business rules (owned by the data team). Shared by the mock backend — which enforces them
 * server-side — and by UI code that wants to explain a disabled action before the server says no:
 *   import { evaluateRsvp, RSVP_REJECTION_MESSAGE_KEYS } from '@/domain/rules';
 * Authorization (WHO may act) stays in '@/auth/policy'; these rules decide WHAT an action does.
 */
export * from './events';
export * from './participants';
export * from './translations';
export * from './announcements';
export * from './mappings';
export * from './directory';
export * from './chapters';
export * from './resources';
