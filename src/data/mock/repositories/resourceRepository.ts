import {
  can,
  canManageResource,
  canUploadResource,
  canViewResource,
  resourceTarget,
} from '@/auth/policy';
import { ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { ResourceRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject } from '@/data/store';
import {
  canDownloadResource,
  matchesResourceLanguage,
  matchesResourceScope,
} from '@/domain/rules/resources';
import {
  computeTranslationStatus,
  fieldWithFallback,
  titleWithFallback,
} from '@/domain/rules/translations';
import { resourceInputSchema } from '@/domain/schemas';
import type {
  AuditAction,
  DownloadTicket,
  ID,
  Resource,
  ResourceInput,
  ResourceView,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { matchesSearch, msg, validateInput } from '../helpers';
import { isLocalTo } from '../services/audience';
import { notifyUsers } from '../services/notify';
import { activeUserSubjects } from '../services/subjects';
import { toResourceView } from '../services/views';

/**
 * Resource library (metadata only) — emulated FastAPI endpoints. Upload/update/archive are scoped
 * by the policy (chapter resources for chapter officers+, national resources for national roles);
 * new resources notify their audience; every change is audited.
 */

function visibleResource(subject: Subject, resourceId: ID): Resource {
  const resource = db.get('resources', resourceId);
  if (!resource || !canViewResource(subject, resource))
    throw new NotFoundError('resource', resourceId);
  return resource;
}

function translationsOf(input: ResourceInput): Resource['translations'] {
  const result: Resource['translations'] = {};
  for (const locale of ['en', 'bg'] as const) {
    const value = input.translations[locale];
    if (value && (value.title || value.description)) {
      result[locale] = { title: value.title, description: value.description };
    }
  }
  return result;
}

function assertChapterExists(chapterId: ID | null): void {
  if (chapterId && !db.get('chapters', chapterId)) {
    throw new ValidationError({ chapterId: 'messages.validation.unknownChapter' });
  }
}

function auditResource(
  subject: Subject,
  action: AuditAction,
  resource: Resource,
  key: string,
): void {
  appendAudit(subject, {
    action,
    entityType: 'resource',
    entityId: resource.id,
    chapterId: resource.chapterId,
    summary: msg(`messages.audit.${key}`, { title: titleWithFallback(resource.translations) }),
    metadata: {
      category: resource.category,
      language: resource.language,
      version: resource.version,
      status: resource.status,
    },
  });
}

function notifyNewResource(subject: Subject, resource: Resource): void {
  const recipients = activeUserSubjects()
    .filter((u) => canViewResource(u.subject, resource))
    .filter((u) => resource.chapterId === null || isLocalTo(u.subject, [resource.chapterId]))
    .map((u) => u.userId);
  notifyUsers(recipients, {
    category: 'resources',
    title: msg('messages.notifications.resourceAdded.title', {
      title: titleWithFallback(resource.translations),
    }),
    body: msg('messages.notifications.resourceAdded.body', {
      description: fieldWithFallback(resource.translations, 'description'),
    }),
    link: {
      to: paths.resources({ q: titleWithFallback(resource.translations).en }),
      entityType: 'resource',
      entityId: resource.id,
    },
    actorId: subject.userId,
  });
}

export function createMockResourceRepository(): ResourceRepository {
  return {
    list: (query = {}) =>
      mockCall((): ResourceView[] => {
        const subject = requireSubject();
        return db
          .list('resources')
          .filter((r) => (query.includeArchived ? true : r.status === 'active'))
          .filter((r) => canViewResource(subject, r))
          .filter(
            (r) => !query.category || query.category === 'all' || r.category === query.category,
          )
          .filter((r) => matchesResourceLanguage(r.language, query.language))
          .filter((r) => matchesResourceScope(r, query.scope))
          .filter((r) => !query.chapterId || r.chapterId === query.chapterId)
          .filter((r) =>
            matchesSearch(
              query.search,
              r.translations.en?.title,
              r.translations.bg?.title,
              r.translations.en?.description,
              r.translations.bg?.description,
              r.fileName,
            ),
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map(toResourceView);
      }),

    get: (resourceId) =>
      mockCall((): ResourceView => {
        const subject = requireSubject();
        return toResourceView(visibleResource(subject, resourceId));
      }),

    create: (input) =>
      mockCall((): ResourceView => {
        const subject = requireSubject();
        const data = validateInput(resourceInputSchema, input);
        assertChapterExists(data.chapterId);
        if (!canUploadResource(subject, data.chapterId)) {
          throw new ForbiddenError('permission_denied', 'resource.upload');
        }
        const now = clock.nowIso();
        const translations = translationsOf(data);
        const resource: Resource = {
          id: createId('res'),
          translations,
          translationStatus: computeTranslationStatus(
            'resource',
            undefined,
            undefined,
            translations,
            can(subject, 'translation.review', resourceTarget(data)),
          ),
          category: data.category,
          language: data.language,
          fileType: data.fileType,
          fileName: data.fileName,
          fileSize: data.fileSize,
          version: data.version,
          chapterId: data.chapterId,
          visibility: data.visibility,
          status: 'active',
          uploadedBy: subject.userId,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          downloadCount: 0,
        };
        db.transaction(() => {
          db.upsert('resources', resource);
          auditResource(subject, 'resource.created', resource, 'resourceCreated');
          notifyNewResource(subject, resource);
        });
        return toResourceView(resource);
      }),

    update: (resourceId, input) =>
      mockCall((): ResourceView => {
        const subject = requireSubject();
        const resource = visibleResource(subject, resourceId);
        if (!canManageResource(subject, resource, 'update')) {
          throw new ForbiddenError('permission_denied', 'resource.update');
        }
        const data = validateInput(resourceInputSchema, input);
        assertChapterExists(data.chapterId);
        if (data.chapterId !== resource.chapterId && !canUploadResource(subject, data.chapterId)) {
          throw new ForbiddenError('permission_denied', 'resource.upload');
        }
        const translations = translationsOf(data);
        const updated: Resource = {
          ...resource,
          translations,
          translationStatus: computeTranslationStatus(
            'resource',
            resource.translationStatus,
            resource.translations,
            translations,
            can(subject, 'translation.review', resourceTarget(data)),
          ),
          category: data.category,
          language: data.language,
          fileType: data.fileType,
          fileName: data.fileName,
          fileSize: data.fileSize,
          version: data.version,
          chapterId: data.chapterId,
          visibility: data.visibility,
          updatedAt: clock.nowIso(),
        };
        db.transaction(() => {
          db.upsert('resources', updated);
          auditResource(subject, 'resource.updated', updated, 'resourceUpdated');
        });
        return toResourceView(updated);
      }),

    archive: (resourceId) =>
      mockCall((): ResourceView => {
        const subject = requireSubject();
        const resource = visibleResource(subject, resourceId);
        if (resource.status !== 'active') throw new ForbiddenError('invalid_transition');
        if (!canManageResource(subject, resource, 'archive')) {
          throw new ForbiddenError('permission_denied', 'resource.archive');
        }
        const now = clock.nowIso();
        const archived: Resource = {
          ...resource,
          status: 'archived',
          archivedAt: now,
          updatedAt: now,
        };
        db.transaction(() => {
          db.upsert('resources', archived);
          auditResource(subject, 'resource.archived', archived, 'resourceArchived');
        });
        return toResourceView(archived);
      }),

    restore: (resourceId) =>
      mockCall((): ResourceView => {
        const subject = requireSubject();
        const resource = visibleResource(subject, resourceId);
        if (resource.status !== 'archived') throw new ForbiddenError('invalid_transition');
        if (!canManageResource(subject, resource, 'archive')) {
          throw new ForbiddenError('permission_denied', 'resource.archive');
        }
        const restored: Resource = {
          ...resource,
          status: 'active',
          archivedAt: null,
          updatedAt: clock.nowIso(),
        };
        db.transaction(() => {
          db.upsert('resources', restored);
          auditResource(subject, 'resource.restored', restored, 'resourceRestored');
        });
        return toResourceView(restored);
      }),

    simulateDownload: (resourceId) =>
      mockCall((): DownloadTicket => {
        const subject = requireSubject();
        const resource = visibleResource(subject, resourceId);
        if (!canDownloadResource(subject, resource, clock.now())) {
          throw new ForbiddenError('invalid_transition');
        }
        db.update('resources', resource.id, { downloadCount: resource.downloadCount + 1 });
        return {
          resourceId: resource.id,
          fileName: resource.fileName,
          fileSize: resource.fileSize,
          simulated: true,
          requestedAt: clock.nowIso(),
        };
      }),
  };
}
