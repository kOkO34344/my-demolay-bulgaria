/**
 * PLACEHOLDER – owned by the access agent. Rendered inside AdminLayout (which owns the page <h1> and
 * the section tabs), so this page starts at <h2> (Section) — do not add a PageHeader here. Keep the
 * default export; the route table in src/app/routes.ts lazy-loads it.
 */
import { FeaturePlaceholder } from '@/features/shell/components/FeaturePlaceholder';

export default function PositionMappingPage() {
  return <FeaturePlaceholder titleKey="nav.admin.mappings" variant="section" />;
}
