import { Navigate } from 'react-router';

import { usePolicy } from '@/auth';
import { PermissionDenied } from '@/components/common/PermissionDenied';
import { paths } from '@/lib/routes';

/** /admin → the first Administration section the subject may open (Members for administrators). */
export function AdminIndexRedirect() {
  const policy = usePolicy();
  const first = policy.visibleAdminTabs()[0];
  if (!first) return <PermissionDenied variant="inline" />;
  return <Navigate to={paths.adminSection(first.section)} replace />;
}
