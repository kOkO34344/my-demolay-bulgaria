import { LanguagesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Locale } from '@/i18n/public';
import { toParagraphs } from '@/lib/text';
import { cn } from '@/lib/utils';

/**
 * Long-form plain text (post bodies, event descriptions): one <p> per blank-line paragraph, single
 * line breaks kept. `lang` is the language the text is actually in (it may be a fallback).
 */
export function PlainTextBody({
  text,
  lang,
  className,
}: {
  text: string | null | undefined;
  lang?: Locale;
  className?: string;
}) {
  const paragraphs = toParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div lang={lang} className={cn('flex flex-col gap-4 leading-[1.7]', className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** Shown when bilingual content exists only in the other language. */
export function TranslationFallbackNote({
  shownLang,
  className,
}: {
  /** Language of the text actually shown. */
  shownLang: Locale;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-sm text-info-soft-foreground',
        className,
      )}
    >
      <LanguagesIcon aria-hidden="true" className="size-4 shrink-0" />
      {t(`common.states.notTranslated.${shownLang}`)}
    </p>
  );
}
