import type {
  AccountStatus,
  LocalizedText,
  Locale,
  ParticipantVisibility,
  Permission,
  Role,
  Scope,
} from '@/domain';
import { formatDate, formatDateTime } from '@/i18n/format';
import { labelKeys } from '@/i18n/labels';
import { buildResources, type TranslationTree } from '@/i18n/resources';

/**
 * Bilingual labels for server-generated message params (notifications, audit summaries). The mock
 * backend reads the same translation resources as the UI so params like a role name render in the
 * reader's language — the FastAPI backend will do the same with its own catalogue.
 */

let cache: Record<Locale, TranslationTree> | null = null;

function lookup(tree: TranslationTree, key: string): string | null {
  let node: string | TranslationTree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return null;
    node = node[part];
  }
  return typeof node === 'string' ? node : null;
}

/** The label behind an i18n key in both languages (the key itself when missing). */
export function localizedLabel(key: string): LocalizedText {
  cache ??= buildResources();
  return { en: lookup(cache.en, key) ?? key, bg: lookup(cache.bg, key) ?? key };
}

export const roleLabel = (role: Role | null): LocalizedText =>
  localizedLabel(role === null ? labelKeys.noRole : labelKeys.role(role));

export const permissionLabel = (permission: Permission): LocalizedText =>
  localizedLabel(labelKeys.permission(permission));

export const accountStatusLabel = (status: AccountStatus): LocalizedText =>
  localizedLabel(labelKeys.accountStatus(status));

export const participantVisibilityLabel = (visibility: ParticipantVisibility): LocalizedText =>
  localizedLabel(labelKeys.participantVisibility(visibility));

export const languageLabel = (lang: Locale): LocalizedText =>
  localizedLabel(labelKeys.language(lang));

/** "Chapter · Sveta Sofia Chapter" / "National". `nameOf` resolves chapter names. */
export function scopeLabel(
  scope: Scope,
  nameOf: (chapterId: string) => LocalizedText | null,
): LocalizedText {
  const level = localizedLabel(labelKeys.scopeLevel(scope.level));
  const names = (scope.chapterIds ?? [])
    .map((id) => nameOf(id))
    .filter((name): name is LocalizedText => name !== null);
  if (names.length === 0) return level;
  return {
    en: `${level.en} · ${names.map((n) => n.en).join(', ')}`,
    bg: `${level.bg} · ${names.map((n) => n.bg).join(', ')}`,
  };
}

/** A date in both languages ("15 October 2026" / „15 октомври 2026 г.“). */
export function dateText(iso: string): LocalizedText {
  return { en: formatDate(iso, 'en', 'long'), bg: formatDate(iso, 'bg', 'long') };
}

/** A date and time in both languages. */
export function dateTimeText(iso: string): LocalizedText {
  return { en: formatDateTime(iso, 'en'), bg: formatDateTime(iso, 'bg') };
}
