/**
 * PLACEHOLDER – owned by the events agent. One page for both routes:
 *   /events/new             → create mode (no :eventId)
 *   /events/:eventId/edit   → edit mode
 * Keep the default export; the route table in src/app/routes.ts lazy-loads it.
 */
import { useParams } from 'react-router';

import { FeaturePlaceholder } from '@/features/shell/components/FeaturePlaceholder';

export default function EventEditorPage() {
  const { eventId } = useParams();
  return (
    <FeaturePlaceholder
      titleKey={eventId ? 'shell.routes.eventEdit' : 'shell.routes.eventCreate'}
    />
  );
}
