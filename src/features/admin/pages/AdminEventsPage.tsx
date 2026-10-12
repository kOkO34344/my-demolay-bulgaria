/**
 * PLACEHOLDER – owned by the admin agent. Rendered inside AdminLayout (which owns the page <h1> and
 * the section tabs), so this page starts at <h2> (Section) — do not add a PageHeader here. Keep the
 * default export; the route table in src/app/routes.ts lazy-loads it.
 */
import { FeaturePlaceholder } from '@/features/shell/components/FeaturePlaceholder';

export default function AdminEventsPage() {
  return <FeaturePlaceholder titleKey="nav.admin.events" variant="section" />;
}
