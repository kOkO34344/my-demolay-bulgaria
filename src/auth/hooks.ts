import { useContext, useMemo } from 'react';

import type { Permission, PolicyTarget, Subject } from '@/domain';

import { bindPolicy, type BoundPolicy } from './boundPolicy';
import { AuthContext, type AuthContextValue } from './context';
import { can } from './policy';

/** Session + auth actions. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within <AuthProvider>');
  return context;
}

/** The effective policy subject (null when signed out). */
export function useSubject(): Subject | null {
  return useAuth().subject;
}

/** Permission check for the current subject: `useCan('post.create', { chapterId })`. */
export function useCan(permission: Permission, target?: PolicyTarget): boolean {
  const subject = useSubject();
  return can(subject, permission, target);
}

/** All policy helpers bound to the current subject (memoised per subject). */
export function usePolicy(): BoundPolicy {
  const subject = useSubject();
  return useMemo(() => bindPolicy(subject), [subject]);
}
