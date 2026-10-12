import { canViewResource } from '@/auth/policy';
import type { Resource, ResourceLanguage, ResourceListQuery, Subject } from '@/domain';

/**
 * Resource library rules. Visibility itself is the policy's `canViewResource` (national resources
 * for everyone with resource.read; chapter resources for that chapter; 'leadership' visibility for
 * officers/advisors/national roles; archived only for those who may archive in scope).
 */

/**
 * Language filter: 'en' / 'bg' match files in that language OR bilingual files ('both');
 * 'both' matches bilingual files only; 'all'/undefined matches everything.
 */
export function matchesResourceLanguage(
  language: ResourceLanguage,
  filter: ResourceListQuery['language'],
): boolean {
  if (!filter || filter === 'all') return true;
  if (filter === 'both') return language === 'both';
  return language === filter || language === 'both';
}

export function matchesResourceScope(
  resource: Pick<Resource, 'chapterId'>,
  scope: ResourceListQuery['scope'],
): boolean {
  if (!scope || scope === 'all') return true;
  return scope === 'national' ? resource.chapterId === null : resource.chapterId !== null;
}

/** Simulated download: only active resources the subject can see. */
export function canDownloadResource(
  subject: Subject | null | undefined,
  resource: Pick<Resource, 'chapterId' | 'status' | 'visibility'>,
  now: Date,
): boolean {
  return resource.status === 'active' && canViewResource(subject, resource, now);
}
