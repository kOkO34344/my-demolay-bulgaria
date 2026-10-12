import type { z } from 'zod';

import { zodFieldErrors } from '@/auth/schemas';
import { NotImplementedError, ValidationError } from '@/data/errors';
import { db, simulateLatency } from '@/data/store';
import type {
  ID,
  LocalizedMessage,
  LocalizedText,
  MessageParam,
  Paginated,
  PersonRef,
} from '@/domain';

/**
 * Shared helpers for the mock repositories (the emulated FastAPI backend). OWNED BY THE DATA TEAM.
 */

/** Rejects (after simulated latency) for operations that are not implemented. Kept for safety. */
export async function notImplemented(operation: string): Promise<never> {
  await simulateLatency();
  throw new NotImplementedError(operation);
}

const UNKNOWN_NAME: LocalizedText = { en: 'Unknown member', bg: 'Неизвестен член' };

/** Public person reference for a user id (safe for any authenticated viewer). */
export function personRef(userId: ID): PersonRef {
  const member = db.get('members', userId);
  return {
    id: userId,
    displayName: member?.displayName ?? UNKNOWN_NAME,
    avatarUrl: member?.avatarUrl ?? null,
  };
}

/** Display name of a member in both languages (for notification / audit params). */
export function displayNameOf(userId: ID | null): LocalizedText {
  if (!userId) return UNKNOWN_NAME;
  return db.get('members', userId)?.displayName ?? UNKNOWN_NAME;
}

/** Chapter name for views (null for national items). */
export function chapterName(chapterId: ID | null): LocalizedText | null {
  if (!chapterId) return null;
  return db.get('chapters', chapterId)?.name ?? null;
}

/** Case- and script-insensitive search across both languages. */
export function matchesSearch(
  search: string | undefined,
  ...values: Array<string | LocalizedText | null | undefined>
): boolean {
  const needle = search?.trim().toLocaleLowerCase();
  if (!needle) return true;
  return values.some((value) => {
    if (!value) return false;
    const texts = typeof value === 'string' ? [value] : [value.en, value.bg];
    return texts.some((text) => text.toLocaleLowerCase().includes(needle));
  });
}

/** Plain-text values inside a LocalizedMessage (audit search). */
export function messageTexts(message: LocalizedMessage): Array<string | LocalizedText> {
  if (message.kind === 'text') return [message.text];
  return Object.values(message.params ?? {}).filter(
    (value): value is string | LocalizedText => typeof value !== 'number',
  );
}

/** Key-based server message: `msg('messages.audit.postPublished', { title })`. */
export function msg(key: string, params?: Record<string, MessageParam>): LocalizedMessage {
  return params ? { kind: 'key', key, params } : { kind: 'key', key };
}

export function paginate<T>(items: T[], page = 1, pageSize = 25): Paginated<T> {
  const size = Math.max(1, Math.min(200, Math.floor(pageSize)));
  const current = Math.max(1, Math.floor(page));
  return {
    items: items.slice((current - 1) * size, current * size),
    total: items.length,
    page: current,
    pageSize: size,
  };
}

/**
 * Server-side validation with a shared zod schema. Throws ValidationError whose fieldErrors are
 * i18n keys (same format the forms use), otherwise returns the parsed (trimmed/normalised) data.
 */
export function validateInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(zodFieldErrors(result.error));
  return result.data;
}

/** Throws ValidationError when `errors` is not empty. */
export function assertNoFieldErrors(errors: Record<string, string>, formErrorKey?: string): void {
  if (Object.keys(errors).length > 0) throw new ValidationError(errors, formErrorKey);
}

/** Newest-first comparator on an ISO timestamp field. */
export function byNewest<T>(pick: (item: T) => string): (a: T, b: T) => number {
  return (a, b) => pick(b).localeCompare(pick(a));
}
