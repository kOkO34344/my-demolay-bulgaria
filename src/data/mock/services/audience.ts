import { chapterRoleChapterIds } from '@/auth/subject';
import type { ID, Subject } from '@/domain';

/**
 * "Local" recipients for chapter-level side effects: notifications about chapter content go to
 * the chapter's own members and chapter-level leaders (incl. multi-chapter advisors), not to every
 * national-scope account that could technically read it.
 */
export function isLocalTo(subject: Subject, chapterIds: readonly ID[]): boolean {
  if (chapterIds.includes(subject.homeChapterId)) return true;
  return chapterRoleChapterIds(subject).some((id) => chapterIds.includes(id));
}
