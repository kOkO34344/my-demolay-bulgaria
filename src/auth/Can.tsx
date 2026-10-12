import type { ReactNode } from 'react';

import type { Permission, PolicyTarget } from '@/domain';

import type { BoundPolicy } from './boundPolicy';
import { usePolicy } from './hooks';

interface CanProps {
  /** Single permission (optionally against a target). */
  permission?: Permission;
  /** Any of these permissions. */
  anyOf?: readonly Permission[];
  target?: PolicyTarget;
  /** Arbitrary object-level check: when={(p) => p.canPublishAnnouncement(post)} */
  when?: (policy: BoundPolicy) => boolean;
  /** Rendered when not allowed (default: nothing). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative permission gate for actions and sections. All given conditions must pass.
 *   <Can permission="post.create"><Button>…</Button></Can>
 *   <Can when={(p) => p.canManageEvent(event)} fallback={null}>…</Can>
 */
export function Can({ permission, anyOf, target, when, fallback = null, children }: CanProps) {
  const policy = usePolicy();
  const allowed =
    (!permission || policy.can(permission, target)) &&
    (!anyOf || policy.canAny(anyOf, target)) &&
    (!when || when(policy));
  return <>{allowed ? children : fallback}</>;
}
