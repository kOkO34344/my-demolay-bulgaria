/**
 * Shared zod command schemas (owned by the data team). The mock backend validates every command
 * with them (errors → ValidationError.fieldErrors with i18n keys), and forms may reuse or extend
 * them with zodResolver:
 *   import { eventInputSchema, eventReadyIssues } from '@/domain/schemas';
 * Messages are i18n keys (see src/i18n/validation.ts and the `messages.validation.*` fragment).
 * Auth forms live in '@/auth/schemas'.
 */
export * from './common';
export * from './announcements';
export * from './events';
export * from './resources';
export * from './chapters';
export * from './access';
export * from './members';
export * from './sync';
