import { NotFoundState } from '@/components/common/ErrorState';

/** Unknown in-app URL (rendered inside the app layout; signed-out visitors are sent to login first). */
export default function NotFoundPage() {
  return <NotFoundState variant="page" />;
}
