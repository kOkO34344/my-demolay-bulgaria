import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  AttendanceEntry,
  AttendanceInput,
  EventCreateInput,
  EventInput,
  EventListQuery,
  EventView,
  ID,
  Participant,
  ParticipantTotals,
  ParticipantVisibility,
  RSVP,
  RsvpStatus,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Events list. Key: events.list(query) */
export function useEvents(query: EventListQuery = {}, options?: QueryOptions<EventView[]>) {
  return useQuery({
    queryKey: queryKeys.events.list(query),
    queryFn: () => repositories.events.list(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** One event (incl. myRsvp + totals). Key: events.detail(eventId) */
export function useEvent(eventId: ID | null | undefined, options?: QueryOptions<EventView>) {
  return useQuery({
    ...options,
    queryKey: queryKeys.events.detail(eventId ?? ''),
    queryFn: () => repositories.events.get(eventId ?? ''),
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

/** The subject's RSVP. Key: events.myRsvp(eventId) */
export function useMyRsvp(eventId: ID | null | undefined, options?: QueryOptions<RSVP | null>) {
  return useQuery({
    ...options,
    queryKey: queryKeys.events.myRsvp(eventId ?? ''),
    queryFn: () => repositories.events.myRsvp(eventId ?? ''),
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

/** Participant list — pass `enabled: canViewParticipants(...)`. Key: events.participants(eventId) */
export function useParticipants(
  eventId: ID | null | undefined,
  options?: QueryOptions<Participant[]>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.events.participants(eventId ?? ''),
    queryFn: () => repositories.events.listParticipants(eventId ?? ''),
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

/** Going / maybe / not going totals. Key: events.totals(eventId) */
export function useParticipantTotals(
  eventId: ID | null | undefined,
  options?: QueryOptions<ParticipantTotals>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.events.totals(eventId ?? ''),
    queryFn: () => repositories.events.participantTotals(eventId ?? ''),
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

/** Attendance sheet — pass `enabled: canViewAttendance(...)`. Key: events.attendance(eventId) */
export function useAttendance(
  eventId: ID | null | undefined,
  options?: QueryOptions<AttendanceEntry[]>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.events.attendance(eventId ?? ''),
    queryFn: () => repositories.events.listAttendance(eventId ?? ''),
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

function onEventChanged(client: QueryClient, event: EventView): Promise<void> {
  client.setQueryData(queryKeys.events.detail(event.id), event);
  return invalidateDomains(client, [
    'events',
    'notifications',
    'audit',
    'translations',
    'chapters',
  ]);
}

function useEventCommand<V>(fn: (variables: V) => Promise<EventView>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: (event) => onEventChanged(client, event) });
}

export const useCreateEvent = () =>
  useEventCommand((input: EventCreateInput) => repositories.events.create(input));
export const useUpdateEvent = () =>
  useEventCommand(({ eventId, input }: { eventId: ID; input: EventInput }) =>
    repositories.events.update(eventId, input),
  );
export const usePublishEvent = () =>
  useEventCommand((eventId: ID) => repositories.events.publish(eventId));
export const useCancelEvent = () =>
  useEventCommand(({ eventId, reason }: { eventId: ID; reason: string }) =>
    repositories.events.cancel(eventId, reason),
  );
export const useSetParticipantVisibility = () =>
  useEventCommand(({ eventId, visibility }: { eventId: ID; visibility: ParticipantVisibility }) =>
    repositories.events.setParticipantVisibility(eventId, visibility),
  );
export const useSetEventCapacity = () =>
  useEventCommand(({ eventId, capacity }: { eventId: ID; capacity: number | null }) =>
    repositories.events.setCapacity(eventId, capacity),
  );

/**
 * RSVP for the signed-in member. Optimistic: the cached event's `myRsvp` flips immediately and
 * rolls back on error (e.g. ConflictError when the event is full).
 */
export function useRsvp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: ID; status: RsvpStatus }) =>
      repositories.events.rsvp(eventId, status),
    onMutate: async ({ eventId, status }) => {
      const key = queryKeys.events.detail(eventId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<EventView>(key);
      if (previous) client.setQueryData<EventView>(key, { ...previous, myRsvp: status });
      return { previous };
    },
    onError: (_error, { eventId }, context) => {
      if (context?.previous)
        client.setQueryData(queryKeys.events.detail(eventId), context.previous);
    },
    onSuccess: (event) => client.setQueryData(queryKeys.events.detail(event.id), event),
    onSettled: () => invalidateDomains(client, ['events', 'notifications']),
  });
}

/** Bulk attendance upsert. */
export function useRecordAttendance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, records }: { eventId: ID; records: AttendanceInput[] }) =>
      repositories.events.recordAttendance(eventId, records),
    onSuccess: (entries, { eventId }) => {
      client.setQueryData(queryKeys.events.attendance(eventId), entries);
      return invalidateDomains(client, ['audit']);
    },
  });
}

export function useAddEventNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }: { eventId: ID; body: string }) =>
      repositories.events.addNote(eventId, body),
    onSuccess: (_note, { eventId }) => {
      void client.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      return invalidateDomains(client, ['audit']);
    },
  });
}

/** Resolves with mock .ics content; the UI turns it into a file download. */
export function useExportEventCalendar() {
  return useMutation({
    mutationFn: (eventId: ID) => repositories.events.exportCalendar(eventId),
  });
}
