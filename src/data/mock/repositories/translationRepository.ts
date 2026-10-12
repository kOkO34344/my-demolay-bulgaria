import {
  announcementTarget,
  can,
  canViewAnnouncement,
  canViewEvent,
  canViewResource,
  eventTarget,
  resourceTarget,
} from '@/auth/policy';
import { ConflictError, ForbiddenError, NotFoundError } from '@/data/errors';
import type { TranslationRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject } from '@/data/store';
import {
  isTranslationComplete,
  titleWithFallback,
  toTranslationTask,
  TRANSLATION_FIELDS,
} from '@/domain/rules/translations';
import {
  translationFieldsSchema,
  translationReviewSchema,
  translationUpdateSchema,
} from '@/domain/schemas';
import {
  LOCALES,
  type Announcement,
  type Event,
  type ID,
  type Locale,
  type PolicyTarget,
  type Resource,
  type Subject,
  type TranslatableEntityType,
  type TranslationState,
  type TranslationTask,
  type TranslationTaskQuery,
} from '@/domain';
import { clock } from '@/lib/clock';
import { z } from 'zod';

import { matchesSearch, msg, validateInput } from '../helpers';

/**
 * Translation administration queue — emulated FastAPI endpoints for bilingual content
 * (announcements, events, resources).
 *  - listTasks: items whose scope the subject may translate (translation.create) or review
 *    (translation.review). Default (no `state`): items with a language that is missing or needs
 *    review; `state: 'all'`: every item; a concrete state: items with that state (in `locale`, or in
 *    any language when no locale is given). Archived / cancelled items are not translatable.
 *  - updateTranslation: saves one COMPLETE language version (translation.create in scope). The state
 *    becomes 'needs_review' unless `state: 'reviewed'` is requested (translation.review in scope);
 *    an unchanged text keeps its previous state.
 *  - markReviewed: marks one complete language version as reviewed (translation.review in scope).
 * Every change is audited (entity type 'translation', entity id = task id).
 */

type TranslatableEntity =
  | { entityType: 'announcement'; record: Announcement }
  | { entityType: 'event'; record: Event }
  | { entityType: 'resource'; record: Resource };

const STATE_ORDER: Record<TranslationState, number> = { missing: 0, needs_review: 1, reviewed: 2 };

function targetOf(entity: TranslatableEntity): PolicyTarget {
  switch (entity.entityType) {
    case 'announcement':
      return announcementTarget(entity.record);
    case 'event':
      return eventTarget(entity.record);
    case 'resource':
      return resourceTarget(entity.record);
  }
}

/** Archived announcements/resources and cancelled events are frozen. */
function isEditable(entity: TranslatableEntity): boolean {
  switch (entity.entityType) {
    case 'announcement':
      return entity.record.status !== 'archived';
    case 'event':
      return entity.record.status !== 'cancelled';
    case 'resource':
      return entity.record.status !== 'archived';
  }
}

function canView(subject: Subject, entity: TranslatableEntity): boolean {
  switch (entity.entityType) {
    case 'announcement':
      return canViewAnnouncement(subject, entity.record);
    case 'event':
      return canViewEvent(subject, entity.record);
    case 'resource':
      return canViewResource(subject, entity.record);
  }
}

function canTranslate(subject: Subject, entity: TranslatableEntity): boolean {
  const target = targetOf(entity);
  return can(subject, 'translation.create', target) || can(subject, 'translation.review', target);
}

function allEntities(): TranslatableEntity[] {
  return [
    ...db.list('announcements').map((record) => ({ entityType: 'announcement' as const, record })),
    ...db.list('events').map((record) => ({ entityType: 'event' as const, record })),
    ...db.list('resources').map((record) => ({ entityType: 'resource' as const, record })),
  ];
}

function findEntity(entityType: TranslatableEntityType, entityId: ID): TranslatableEntity | null {
  switch (entityType) {
    case 'announcement': {
      const record = db.get('announcements', entityId);
      return record ? { entityType, record } : null;
    }
    case 'event': {
      const record = db.get('events', entityId);
      return record ? { entityType, record } : null;
    }
    case 'resource': {
      const record = db.get('resources', entityId);
      return record ? { entityType, record } : null;
    }
  }
}

/** Loads an entity the subject may translate; never leaks existence of invisible items. */
function requireTranslatable(
  subject: Subject,
  entityType: TranslatableEntityType,
  entityId: ID,
): TranslatableEntity {
  const entity = findEntity(entityType, entityId);
  if (!entity || (!canTranslate(subject, entity) && !canView(subject, entity))) {
    throw new NotFoundError(entityType, entityId);
  }
  return entity;
}

function save(entity: TranslatableEntity): void {
  switch (entity.entityType) {
    case 'announcement':
      db.upsert('announcements', entity.record);
      return;
    case 'event':
      db.upsert('events', entity.record);
      return;
    case 'resource':
      db.upsert('resources', entity.record);
      return;
  }
}

function withLocale(
  entity: TranslatableEntity,
  locale: Locale,
  fields: Record<string, string>,
  state: TranslationState,
  touch: boolean,
): TranslatableEntity {
  const translationStatus = { ...entity.record.translationStatus, [locale]: state };
  const updatedAt = touch ? clock.nowIso() : entity.record.updatedAt;
  const text = (field: string): string => fields[field] ?? '';
  switch (entity.entityType) {
    case 'announcement':
      return {
        entityType: 'announcement',
        record: {
          ...entity.record,
          translations: {
            ...entity.record.translations,
            [locale]: { title: text('title'), summary: text('summary'), body: text('body') },
          },
          translationStatus,
          updatedAt,
        },
      };
    case 'event':
      return {
        entityType: 'event',
        record: {
          ...entity.record,
          translations: {
            ...entity.record.translations,
            [locale]: {
              title: text('title'),
              summary: text('summary'),
              description: text('description'),
            },
          },
          translationStatus,
          updatedAt,
        },
      };
    case 'resource':
      return {
        entityType: 'resource',
        record: {
          ...entity.record,
          translations: {
            ...entity.record.translations,
            [locale]: { title: text('title'), description: text('description') },
          },
          translationStatus,
          updatedAt,
        },
      };
  }
}

function readField(value: object, field: string): string {
  const raw: unknown = Reflect.get(value, field);
  return typeof raw === 'string' ? raw : '';
}

/** The stored fields of one language version ('' for missing fields). */
function currentFields(entity: TranslatableEntity, locale: Locale): Record<string, string> {
  const value: object = entity.record.translations[locale] ?? {};
  return Object.fromEntries(
    TRANSLATION_FIELDS[entity.entityType].map((field) => [field, readField(value, field)]),
  );
}

function sameText(entity: TranslatableEntity, locale: Locale, fields: Record<string, string>) {
  const current = currentFields(entity, locale);
  return TRANSLATION_FIELDS[entity.entityType].every(
    (field) => (current[field] ?? '').trim() === (fields[field] ?? '').trim(),
  );
}

function taskOf(entity: TranslatableEntity): TranslationTask {
  return toTranslationTask(entity.entityType, entity.record);
}

function matchesState(task: TranslationTask, query: TranslationTaskQuery): boolean {
  const locales: readonly Locale[] =
    query.locale && query.locale !== 'all' ? [query.locale] : LOCALES;
  if (query.state === 'all') return true;
  if (query.state === undefined) return locales.some((l) => task.locales[l] !== 'reviewed');
  return locales.some((l) => task.locales[l] === query.state);
}

function urgency(task: TranslationTask): number {
  return Math.min(...LOCALES.map((l) => STATE_ORDER[task.locales[l]]));
}

function auditTranslation(
  subject: Subject,
  action: 'translation.updated' | 'translation.reviewed',
  entity: TranslatableEntity,
  locale: Locale,
  state: TranslationState,
): void {
  const verb = action === 'translation.updated' ? 'translationUpdated' : 'translationReviewed';
  appendAudit(subject, {
    action,
    entityType: 'translation',
    entityId: `${entity.entityType}:${entity.record.id}`,
    chapterId: entity.record.chapterId,
    summary: msg(`messages.audit.${verb}${locale === 'en' ? 'En' : 'Bg'}`, {
      title: titleWithFallback(entity.record.translations),
    }),
    metadata: {
      entityType: entity.entityType,
      entityId: entity.record.id,
      locale,
      state,
    },
  });
}

export function createMockTranslationRepository(): TranslationRepository {
  return {
    listTasks: (query = {}) =>
      mockCall((): TranslationTask[] => {
        const subject = requireSubject();
        if (!can(subject, 'translation.create') && !can(subject, 'translation.review')) {
          throw new ForbiddenError('permission_denied', 'translation.create');
        }
        return allEntities()
          .filter((entity) => isEditable(entity) && canTranslate(subject, entity))
          .filter(
            (entity) =>
              !query.entityType ||
              query.entityType === 'all' ||
              entity.entityType === query.entityType,
          )
          .map(taskOf)
          .filter((task) => matchesState(task, query))
          .filter((task) => matchesSearch(query.search, task.title, task.entityId))
          .sort(
            (a, b) =>
              urgency(a) - urgency(b) ||
              b.updatedAt.localeCompare(a.updatedAt) ||
              a.id.localeCompare(b.id),
          );
      }),

    updateTranslation: (input) =>
      mockCall((): TranslationTask => {
        const subject = requireSubject();
        const data = validateInput(translationUpdateSchema, input);
        const entity = requireTranslatable(subject, data.entityType, data.entityId);
        const target = targetOf(entity);
        if (!can(subject, 'translation.create', target)) {
          throw new ForbiddenError('permission_denied', 'translation.create');
        }
        if (data.state === 'reviewed' && !can(subject, 'translation.review', target)) {
          throw new ForbiddenError('permission_denied', 'translation.review');
        }
        if (!isEditable(entity)) throw new ConflictError('messages.errors.notEditable');
        const { fields } = validateInput(
          z.object({ fields: translationFieldsSchema(data.entityType) }),
          { fields: data.fields },
        );
        const previous = entity.record.translationStatus[data.locale];
        const unchanged = sameText(entity, data.locale, fields);
        const state: TranslationState =
          data.state ?? (unchanged && previous !== 'missing' ? previous : 'needs_review');
        if (unchanged && state === previous) return taskOf(entity);
        const updated = withLocale(entity, data.locale, fields, state, !unchanged);
        db.transaction(() => {
          save(updated);
          // New text, or a reviewed version explicitly re-opened for review.
          if (!unchanged || state === 'needs_review') {
            auditTranslation(subject, 'translation.updated', updated, data.locale, state);
          }
          if (state === 'reviewed' && previous !== 'reviewed') {
            auditTranslation(subject, 'translation.reviewed', updated, data.locale, state);
          }
        });
        return taskOf(updated);
      }),

    markReviewed: (input) =>
      mockCall((): TranslationTask => {
        const subject = requireSubject();
        const data = validateInput(translationReviewSchema, input);
        const entity = requireTranslatable(subject, data.entityType, data.entityId);
        if (!can(subject, 'translation.review', targetOf(entity))) {
          throw new ForbiddenError('permission_denied', 'translation.review');
        }
        if (!isEditable(entity)) throw new ConflictError('messages.errors.notEditable');
        const value = entity.record.translations[data.locale];
        if (!isTranslationComplete(data.entityType, value)) {
          throw new ConflictError('messages.errors.translationIncomplete');
        }
        if (entity.record.translationStatus[data.locale] === 'reviewed') return taskOf(entity);
        const fields = currentFields(entity, data.locale);
        const reviewed = withLocale(entity, data.locale, fields, 'reviewed', false);
        db.transaction(() => {
          save(reviewed);
          auditTranslation(subject, 'translation.reviewed', reviewed, data.locale, 'reviewed');
        });
        return taskOf(reviewed);
      }),
  };
}
