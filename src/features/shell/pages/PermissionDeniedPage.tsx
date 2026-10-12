import { PermissionDenied } from '@/components/common/PermissionDenied';

/**
 * Full-page permission-denied state. Route guards render `<PermissionDenied />` directly; this page
 * exists for direct use (e.g. a feature that detects a 403 for the whole page).
 */
export default function PermissionDeniedPage() {
  return <PermissionDenied variant="page" />;
}
