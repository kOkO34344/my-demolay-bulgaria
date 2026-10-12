import type { TFunction } from 'i18next';

import type { LocalizedMessage, MessageParam } from '@/domain/types/common';

import type { Locale } from './config';
import { localizeText } from './localize';

function resolveParam(param: MessageParam, lang: Locale): string | number {
  return typeof param === 'object' ? localizeText(param, lang) : param;
}

/**
 * Renders a server-generated LocalizedMessage (notification title/body, audit summary) in the
 * active language: literal bilingual text, or an i18n key whose LocalizedText params are resolved.
 */
export function formatMessage(
  message: LocalizedMessage | null | undefined,
  t: TFunction,
  lang: Locale,
): string {
  if (!message) return '';
  if (message.kind === 'text') return localizeText(message.text, lang);
  const params: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(message.params ?? {})) {
    params[name] = resolveParam(value, lang);
  }
  return t(message.key, params);
}
