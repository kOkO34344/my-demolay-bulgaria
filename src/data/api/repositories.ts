import type {
  AnnouncementView,
  AttendanceEntry,
  AuditLogEntryView,
  CalendarExport,
  Chapter,
  ChapterDetail,
  ChapterSummary,
  CurrentMember,
  DirectoryEntry,
  DownloadTicket,
  EventNote,
  EventView,
  ImportedPositionSummary,
  InAppMessageView,
  InvitationPreview,
  InvitationView,
  IntegrationStatus,
  MappingPreview,
  MemberDetail,
  MemberSummary,
  Notification,
  NotificationPreferences,
  BroadcastResult,
  Paginated,
  Participant,
  ParticipantTotals,
  PasswordResetTicket,
  PositionRoleMapping,
  ResourceView,
  RoleAssignment,
  RoleDefinition,
  RSVP,
  Session,
  SignupOptions,
  SignupResult,
  SignupTicket,
  SpecialAssignment,
  SyncException,
  SyncJob,
  SyncJobDetail,
  TranslationTask,
  VerificationDecisionResult,
  VerificationRequestView,
} from '@/domain';

import type {
  AuditRepository,
  AuthRepository,
  ChapterRepository,
  EventRepository,
  InvitationRepository,
  MemberRepository,
  NotificationRepository,
  PostRepository,
  Repositories,
  ResourceRepository,
  RoleRepository,
  SignupRepository,
  SyncRepository,
  TranslationRepository,
  VerificationRepository,
} from '../repositories';

import { ApiUnavailableError } from '../errors';
import type { ApiClient } from './apiClient';

/**
 * FastAPI implementations of every repository. Each method names its endpoint; with no backend
 * configured they reject with ApiUnavailableError ("API not available in prototype").
 * Migration: implement the endpoint server-side, set VITE_DATA_SOURCE=api + VITE_API_BASE_URL —
 * hooks and UI stay unchanged.
 */

const e = encodeURIComponent;

export function createApiAuthRepository(api: ApiClient): AuthRepository {
  return {
    login: (input) => api.post<Session>('/auth/login', input),
    logout: () => api.post<void>('/auth/logout'),
    getSession: () => api.get<Session | null>('/auth/session'),
    changePassword: (input) => api.post<void>('/auth/password/change', input),
    requestPasswordReset: (input) =>
      api.post<PasswordResetTicket>('/auth/password/reset-request', input),
    resetPassword: (input) => api.post<void>('/auth/password/reset', input),
    // Prototype-only feature: deliberately has no production endpoint.
    switchDemoRole: () =>
      Promise.reject(new ApiUnavailableError('demo role switcher (prototype only)')),
  };
}

export function createApiMemberRepository(api: ApiClient): MemberRepository {
  return {
    getMe: () => api.get<CurrentMember>('/members/me'),
    updateOwnProfile: (input) => api.patch<CurrentMember>('/members/me', input),
    list: (query) => api.get<Paginated<MemberSummary>>('/members', query),
    get: (userId) => api.get<MemberDetail>(`/members/${e(userId)}`),
    directory: (chapterId) => api.get<DirectoryEntry[]>(`/chapters/${e(chapterId)}/directory`),
    setStatus: (input) =>
      api.post<MemberDetail>(`/members/${e(input.userId)}/status`, {
        status: input.status,
        reason: input.reason,
      }),
    sendMessage: (input) => api.post<InAppMessageView>('/messages', input),
    listMyMessages: () => api.get<InAppMessageView[]>('/messages'),
    markMessageRead: (id) => api.post<void>(`/messages/${e(id)}/read`),
  };
}

export function createApiChapterRepository(api: ApiClient): ChapterRepository {
  return {
    list: () => api.get<Chapter[]>('/chapters'),
    get: (id) => api.get<ChapterDetail>(`/chapters/${e(id)}`),
    summaries: () => api.get<ChapterSummary[]>('/chapters/summaries'),
    create: (input) => api.post<Chapter>('/chapters', input),
    update: (id, input) => api.put<Chapter>(`/chapters/${e(id)}`, input),
  };
}

export function createApiPostRepository(api: ApiClient): PostRepository {
  return {
    list: (query) => api.get<AnnouncementView[]>('/posts/feed', query),
    listManaged: (query) => api.get<AnnouncementView[]>('/posts', query),
    get: (id) => api.get<AnnouncementView>(`/posts/${e(id)}`),
    getRelated: (id) => api.get<AnnouncementView[]>(`/posts/${e(id)}/related`),
    create: (input) => api.post<AnnouncementView>('/posts', input),
    update: (id, input) => api.put<AnnouncementView>(`/posts/${e(id)}`, input),
    submit: (id) => api.post<AnnouncementView>(`/posts/${e(id)}/submit`),
    withdraw: (id) => api.post<AnnouncementView>(`/posts/${e(id)}/withdraw`),
    publish: (id) => api.post<AnnouncementView>(`/posts/${e(id)}/publish`),
    returnToDraft: (id, note) => api.post<AnnouncementView>(`/posts/${e(id)}/return`, { note }),
    archive: (id) => api.post<AnnouncementView>(`/posts/${e(id)}/archive`),
    restore: (id) => api.post<AnnouncementView>(`/posts/${e(id)}/restore`),
    markRead: (id) => api.put<void>(`/posts/${e(id)}/read`),
  };
}

export function createApiEventRepository(api: ApiClient): EventRepository {
  return {
    list: (query) => api.get<EventView[]>('/events', query),
    get: (id) => api.get<EventView>(`/events/${e(id)}`),
    create: (input) => api.post<EventView>('/events', input),
    update: (id, input) => api.put<EventView>(`/events/${e(id)}`, input),
    publish: (id) => api.post<EventView>(`/events/${e(id)}/publish`),
    cancel: (id, reason) => api.post<EventView>(`/events/${e(id)}/cancel`, { reason }),
    setParticipantVisibility: (id, participantVisibility) =>
      api.patch<EventView>(`/events/${e(id)}`, { participantVisibility }),
    setCapacity: (id, capacity) => api.patch<EventView>(`/events/${e(id)}`, { capacity }),
    rsvp: (id, status) => api.put<EventView>(`/events/${e(id)}/rsvp`, { status }),
    myRsvp: (id) => api.get<RSVP | null>(`/events/${e(id)}/rsvp`),
    listParticipants: (id) => api.get<Participant[]>(`/events/${e(id)}/participants`),
    participantTotals: (id) => api.get<ParticipantTotals>(`/events/${e(id)}/participants/totals`),
    listAttendance: (id) => api.get<AttendanceEntry[]>(`/events/${e(id)}/attendance`),
    recordAttendance: (id, records) =>
      api.put<AttendanceEntry[]>(`/events/${e(id)}/attendance`, records),
    addNote: (id, body) => api.post<EventNote>(`/events/${e(id)}/notes`, { body }),
    exportCalendar: (id) => api.get<CalendarExport>(`/events/${e(id)}/calendar`),
  };
}

export function createApiResourceRepository(api: ApiClient): ResourceRepository {
  return {
    list: (query) => api.get<ResourceView[]>('/resources', query),
    get: (id) => api.get<ResourceView>(`/resources/${e(id)}`),
    create: (input) => api.post<ResourceView>('/resources', input),
    update: (id, input) => api.put<ResourceView>(`/resources/${e(id)}`, input),
    archive: (id) => api.post<ResourceView>(`/resources/${e(id)}/archive`),
    restore: (id) => api.post<ResourceView>(`/resources/${e(id)}/restore`),
    simulateDownload: (id) => api.get<DownloadTicket>(`/resources/${e(id)}/download`),
  };
}

export function createApiNotificationRepository(api: ApiClient): NotificationRepository {
  return {
    list: (query) => api.get<Notification[]>('/notifications', query),
    unreadCount: () => api.get<number>('/notifications/unread-count'),
    markRead: (id) => api.post<void>(`/notifications/${e(id)}/read`),
    markAllRead: () => api.post<void>('/notifications/read-all'),
    getPreferences: () => api.get<NotificationPreferences>('/members/me/notification-preferences'),
    updatePreferences: (prefs) =>
      api.put<NotificationPreferences>('/members/me/notification-preferences', prefs),
    broadcast: (input) => api.post<BroadcastResult>('/notifications/broadcast', input),
  };
}

export function createApiAuditRepository(api: ApiClient): AuditRepository {
  return {
    list: (query) => api.get<Paginated<AuditLogEntryView>>('/audit', query),
    forEntity: (entityType, entityId) =>
      api.get<AuditLogEntryView[]>('/audit/entity', { entityType, entityId }),
    forMember: (userId) => api.get<AuditLogEntryView[]>(`/members/${e(userId)}/audit`),
  };
}

export function createApiRoleRepository(api: ApiClient): RoleRepository {
  return {
    listRoleDefinitions: () => api.get<RoleDefinition[]>('/roles'),
    listAssignments: (query) => api.get<RoleAssignment[]>('/role-assignments', query),
    assignRole: (input) =>
      api.post<RoleAssignment>(`/members/${e(input.userId)}/roles`, {
        role: input.role,
        scope: input.scope,
        reason: input.reason,
      }),
    removeRole: (input) =>
      api.post<RoleAssignment>(`/role-assignments/${e(input.assignmentId)}/end`, {
        reason: input.reason,
      }),
    listSpecialAssignments: (query) => api.get<SpecialAssignment[]>('/special-assignments', query),
    createSpecialAssignment: (input) => api.post<SpecialAssignment>('/special-assignments', input),
    revokeSpecialAssignment: (id, reason) =>
      api.post<SpecialAssignment>(`/special-assignments/${e(id)}/revoke`, { reason }),
    listMappings: () => api.get<PositionRoleMapping[]>('/position-mappings'),
    createMapping: (input) => api.post<PositionRoleMapping>('/position-mappings', input),
    updateMapping: (id, input) =>
      api.put<PositionRoleMapping>(`/position-mappings/${e(id)}`, input),
    deleteMapping: (id) => api.delete<void>(`/position-mappings/${e(id)}`),
    previewMapping: (positionCode) =>
      api.get<MappingPreview>('/position-mappings/preview', { positionCode }),
    listImportedPositions: () => api.get<ImportedPositionSummary[]>('/positions'),
  };
}

export function createApiSyncRepository(api: ApiClient): SyncRepository {
  return {
    getStatus: () => api.get<IntegrationStatus>('/integration/status'),
    listJobs: () => api.get<SyncJob[]>('/integration/sync-jobs'),
    getJob: (id) => api.get<SyncJobDetail>(`/integration/sync-jobs/${e(id)}`),
    runDemoSync: () => api.post<SyncJob>('/integration/sync-jobs'),
    listExceptions: (query) => api.get<SyncException[]>('/integration/exceptions', query),
    resolveException: (id, input) =>
      api.post<SyncException>(`/integration/exceptions/${e(id)}/resolve`, input),
    ignoreException: (id, note) =>
      api.post<SyncException>(`/integration/exceptions/${e(id)}/ignore`, { note }),
  };
}

export function createApiTranslationRepository(api: ApiClient): TranslationRepository {
  return {
    listTasks: (query) => api.get<TranslationTask[]>('/translations/tasks', query),
    updateTranslation: (input) =>
      api.put<TranslationTask>(
        `/translations/${e(input.entityType)}/${e(input.entityId)}/${e(input.locale)}`,
        { fields: input.fields, state: input.state },
      ),
    markReviewed: (input) =>
      api.post<TranslationTask>(
        `/translations/${e(input.entityType)}/${e(input.entityId)}/${e(input.locale)}/review`,
      ),
  };
}

export function createApiSignupRepository(api: ApiClient): SignupRepository {
  return {
    options: () => api.get<SignupOptions>('/signup/options'),
    start: (input) => api.post<SignupTicket>('/signup', input),
    resend: (signupId) => api.post<SignupTicket>(`/signup/${e(signupId)}/resend`),
    verify: (input) =>
      api.post<SignupResult>(`/signup/${e(input.signupId)}/verify`, {
        emailCode: input.emailCode,
        phoneCode: input.phoneCode,
      }),
  };
}

export function createApiVerificationRepository(api: ApiClient): VerificationRepository {
  return {
    list: () => api.get<VerificationRequestView[]>('/verifications'),
    decide: (input) =>
      api.post<VerificationDecisionResult>(`/verifications/${e(input.userId)}/decision`, {
        decision: input.decision,
        reason: input.reason,
      }),
  };
}

export function createApiInvitationRepository(api: ApiClient): InvitationRepository {
  return {
    list: () => api.get<InvitationView[]>('/invitations'),
    create: (input) => api.post<InvitationView>('/invitations', input),
    revoke: (id) => api.post<InvitationView>(`/invitations/${e(id)}/revoke`),
    preview: (token) => api.get<InvitationPreview>(`/invitations/by-token/${e(token)}`),
  };
}

export function createApiRepositories(api: ApiClient): Repositories {
  return {
    auth: createApiAuthRepository(api),
    members: createApiMemberRepository(api),
    chapters: createApiChapterRepository(api),
    posts: createApiPostRepository(api),
    events: createApiEventRepository(api),
    resources: createApiResourceRepository(api),
    notifications: createApiNotificationRepository(api),
    audit: createApiAuditRepository(api),
    roles: createApiRoleRepository(api),
    sync: createApiSyncRepository(api),
    translations: createApiTranslationRepository(api),
    signup: createApiSignupRepository(api),
    verifications: createApiVerificationRepository(api),
    invitations: createApiInvitationRepository(api),
  };
}
