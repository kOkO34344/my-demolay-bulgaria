import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConflictError } from '@/data/errors';
import {
  useEvent,
  useEvents,
  useIntegrationStatus,
  useManagedPosts,
  usePublishPost,
  useRsvp,
  useRunDemoSync,
  useSyncJobs,
  useTranslationTasks,
  useUnreadNotificationCount,
  useUpdateTranslation,
} from '@/data/hooks';
import { createTestQueryClient } from '@/test/render';

import { SEED_IDS } from './seed';
import { cancelDemoSyncTimers, setDemoSyncDuration } from './sync/engine';
import { signInAs } from './testing';

/**
 * Hook-level integration: TanStack Query hooks → registry → mock repositories → session store.
 * Verifies that mutations invalidate what the UI shows and that sync progress is visible to polling.
 */

function setup(): { client: QueryClient; wrapper: (props: { children: ReactNode }) => ReactNode } {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

afterEach(() => {
  cancelDemoSyncTimers();
  setDemoSyncDuration(null);
});

describe('data hooks with the mock backend', () => {
  it('RSVP updates the event detail and the events list', async () => {
    signInAs('active_member');
    const { wrapper } = setup();
    const eventId = SEED_IDS.events.memberCanRsvp;
    const { result } = renderHook(
      () => ({
        event: useEvent(eventId),
        list: useEvents({ when: 'upcoming' }),
        rsvp: useRsvp(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.event.data?.myRsvp).toBeNull());
    const goingBefore = result.current.event.data?.totals.going ?? 0;
    act(() => result.current.rsvp.mutate({ eventId, status: 'going' }));
    await waitFor(() => expect(result.current.event.data?.totals.going).toBe(goingBefore + 1));
    expect(result.current.event.data?.myRsvp).toBe('going');
    await waitFor(() =>
      expect(result.current.list.data?.find((e) => e.id === eventId)?.myRsvp).toBe('going'),
    );
  });

  it('a rejected RSVP rolls back the optimistic update and surfaces the typed error', async () => {
    signInAs('active_member');
    const { wrapper } = setup();
    const eventId = SEED_IDS.events.full;
    const { result } = renderHook(() => ({ event: useEvent(eventId), rsvp: useRsvp() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.event.data).toBeDefined());
    act(() => result.current.rsvp.mutate({ eventId, status: 'going' }));
    await waitFor(() => expect(result.current.rsvp.isError).toBe(true));
    expect(result.current.rsvp.error).toBeInstanceOf(ConflictError);
    expect((result.current.rsvp.error as ConflictError).reasonKey).toBe(
      'messages.errors.eventFull',
    );
    expect(result.current.event.data?.myRsvp).toBeNull();
  });

  it('publishing a submission refreshes the management list', async () => {
    signInAs('chapter_chairman');
    const { wrapper } = setup();
    const postId = SEED_IDS.posts.advisorCanPublish;
    const { result } = renderHook(
      () => ({ submitted: useManagedPosts({ status: 'submitted' }), publish: usePublishPost() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.submitted.data?.map((p) => p.id)).toContain(postId));
    act(() => result.current.publish.mutate(postId));
    await waitFor(() =>
      expect(result.current.submitted.data?.map((p) => p.id)).not.toContain(postId),
    );
  });

  it('translation edits refresh the translation queue', async () => {
    signInAs('chapter_secretary');
    const { wrapper } = setup();
    const entityId = SEED_IDS.posts.officerDraft;
    const { result } = renderHook(
      () => ({
        missing: useTranslationTasks({ state: 'missing' }),
        update: useUpdateTranslation(),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.missing.data?.map((t) => t.entityId)).toContain(entityId),
    );
    act(() =>
      result.current.update.mutate({
        entityType: 'announcement',
        entityId,
        locale: 'bg',
        fields: { title: 'Базар', summary: 'Помощ в събота.', body: 'Подробности на срещата.' },
      }),
    );
    await waitFor(() =>
      expect(result.current.missing.data?.map((t) => t.entityId)).not.toContain(entityId),
    );
  });

  it('polling shows sync progress and refreshes status and the bell when the run finishes', async () => {
    setDemoSyncDuration(400);
    signInAs('sysadmin');
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        jobs: useSyncJobs(),
        status: useIntegrationStatus(),
        unread: useUnreadNotificationCount(),
        run: useRunDemoSync(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.unread.data).toBeDefined());
    await waitFor(() => expect(result.current.status.data).toBeDefined());
    const unreadBefore = result.current.unread.data ?? 0;
    const openBefore = result.current.status.data?.openExceptionCount ?? 0;
    act(() => result.current.run.mutate());
    await waitFor(() => expect(result.current.jobs.data?.[0]?.id).toBe('sync-run-1'));
    await waitFor(() => expect(result.current.jobs.data?.[0]?.stage).toBe('done'), {
      timeout: 4_000,
    });
    // Refreshed by the hook layer when polling sees the run finish (no manual refetch).
    await waitFor(() => expect(result.current.unread.data).toBe(unreadBefore + 1));
    await waitFor(() =>
      expect(result.current.status.data?.openExceptionCount).toBe(openBefore + 1),
    );
  }, 10_000);
});
