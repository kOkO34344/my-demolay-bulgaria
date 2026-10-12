import { useCallback } from 'react';

import { useChapters } from '@/data/hooks';
import type { ID } from '@/domain';
import { useLocalized } from '@/i18n/public';

/**
 * Resolves chapter ids to localized names from the cached chapter list (one shared query).
 * Returns `null` while loading or for unknown ids — render a fallback (e.g. the generic scope label).
 *   const chapterName = useChapterName();
 *   chapterName(post.chapterId) // „Света София“ / "Sveta Sofia Chapter"
 */
export function useChapterName(
  enabled = true,
): (chapterId: ID | null | undefined) => string | null {
  const { text } = useLocalized();
  const { data } = useChapters({ enabled });
  return useCallback(
    (chapterId) => {
      if (!chapterId || !data) return null;
      const chapter = data.find((c) => c.id === chapterId);
      return chapter ? text(chapter.name) : null;
    },
    [data, text],
  );
}
