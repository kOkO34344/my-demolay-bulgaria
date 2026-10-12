import { SCOPE_LEVELS, type ID, type PolicyTarget, type Scope, type ScopeLevel } from '@/domain';

/** 0 = self … 4 = system */
export function scopeRank(level: ScopeLevel): number {
  return SCOPE_LEVELS.indexOf(level);
}

const isChapterLevel = (level: ScopeLevel): boolean =>
  level === 'chapter' || level === 'multi_chapter';
const isNationalLevel = (level: ScopeLevel): boolean => level === 'national' || level === 'system';

export function chapterScope(chapterId: ID): Scope {
  return { level: 'chapter', chapterIds: [chapterId] };
}

export const NATIONAL_SCOPE: Scope = { level: 'national' };
export const SYSTEM_SCOPE: Scope = { level: 'system' };
export const SELF_SCOPE: Scope = { level: 'self' };

/** Normalised copy (chapterIds only for chapter-level scopes, deduplicated). */
export function normalizeScope(scope: Scope): Scope {
  if (isChapterLevel(scope.level)) {
    return { level: scope.level, chapterIds: [...new Set(scope.chapterIds ?? [])] };
  }
  return { level: scope.level };
}

/**
 * Resolves a role grant's scope LEVEL against the holder's assignment scope.
 * The effective scope is the narrower of the two, so a chapter-scoped assignment can never
 * yield national power, and chapter-level grants inherit the assignment's chapters.
 */
export function resolveGrantScope(
  grantLevel: ScopeLevel,
  assignment: Scope,
  homeChapterId: ID,
): Scope {
  if (grantLevel === 'self' || assignment.level === 'self') return SELF_SCOPE;
  if (isChapterLevel(grantLevel)) {
    return isChapterLevel(assignment.level)
      ? normalizeScope(assignment)
      : chapterScope(homeChapterId);
  }
  // grant is national or system
  if (isChapterLevel(assignment.level)) return normalizeScope(assignment);
  if (grantLevel === 'system' && assignment.level === 'system') return SYSTEM_SCOPE;
  return NATIONAL_SCOPE;
}

/**
 * Does a (resolved) scope cover the target object?
 *  - system / national cover everything.
 *  - chapter / multi_chapter cover objects whose chapter(s) are ALL in the scope; never national objects.
 *  - self covers only objects owned by the subject.
 *  - Any scope covers the subject's own records when no chapter constraint is given.
 *  - An empty target means "holds the permission somewhere" (capability check).
 */
export function scopeCovers(
  scope: Scope,
  target: PolicyTarget | undefined,
  subjectUserId: ID,
): boolean {
  if (isNationalLevel(scope.level)) return true;
  const t = target ?? {};
  const targetChapterIds = t.chapterIds ?? [];
  const hasChapterConstraint =
    t.chapterId !== undefined || targetChapterIds.length > 0 || t.level !== undefined;
  const hasOwner = t.ownerId !== undefined;
  const isOwn = hasOwner && t.ownerId === subjectUserId;

  if (scope.level === 'self') {
    return hasOwner ? isOwn : !hasChapterConstraint;
  }

  // chapter / multi_chapter
  if (!hasChapterConstraint) return hasOwner ? isOwn : true;
  if (t.level === 'national') return false;
  const covered = new Set(scope.chapterIds ?? []);
  if (targetChapterIds.length > 0 && !targetChapterIds.every((id) => covered.has(id))) return false;
  if (t.chapterId === null) return targetChapterIds.length > 0;
  if (typeof t.chapterId === 'string' && !covered.has(t.chapterId)) return false;
  return true;
}

/** Does scope `outer` contain every object addressable by scope `inner`? (Scope ⊇ Scope) */
export function scopeContains(outer: Scope, inner: Scope): boolean {
  if (outer.level === 'system') return true;
  if (outer.level === 'national') return inner.level !== 'system';
  if (outer.level === 'self') return inner.level === 'self';
  // chapter / multi_chapter
  if (inner.level === 'self') return true;
  if (!isChapterLevel(inner.level)) return false;
  const covered = new Set(outer.chapterIds ?? []);
  const innerIds = inner.chapterIds ?? [];
  return innerIds.length > 0 && innerIds.every((id) => covered.has(id));
}

export function scopesEqual(a: Scope, b: Scope): boolean {
  const na = normalizeScope(a);
  const nb = normalizeScope(b);
  if (na.level !== nb.level) return false;
  const ia = [...(na.chapterIds ?? [])].sort();
  const ib = [...(nb.chapterIds ?? [])].sort();
  return ia.length === ib.length && ia.every((id, i) => id === ib[i]);
}
