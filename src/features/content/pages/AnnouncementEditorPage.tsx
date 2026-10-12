/**
 * PLACEHOLDER – owned by the content agent. One page for both routes:
 *   /content/new            → create mode (no :postId)
 *   /content/:postId/edit   → edit mode
 * Keep the default export; the route table in src/app/routes.ts lazy-loads it.
 */
import { useParams } from 'react-router';

import { FeaturePlaceholder } from '@/features/shell/components/FeaturePlaceholder';

export default function AnnouncementEditorPage() {
  const { postId } = useParams();
  return (
    <FeaturePlaceholder
      titleKey={postId ? 'shell.routes.contentEdit' : 'shell.routes.contentCreate'}
    />
  );
}
