import type {
  TranslationReviewInput,
  TranslationTask,
  TranslationTaskQuery,
  TranslationUpdateInput,
} from '@/domain';

/** Translation administration queue for bilingual content (announcements, events, resources). */
export interface TranslationRepository {
  /** GET /api/v1/translations/tasks?state=&entity_type=&locale=&search= */
  listTasks(query?: TranslationTaskQuery): Promise<TranslationTask[]>;

  /** PUT /api/v1/translations/{entity_type}/{entity_id}/{locale} (translation.create in scope) */
  updateTranslation(input: TranslationUpdateInput): Promise<TranslationTask>;

  /** POST /api/v1/translations/{entity_type}/{entity_id}/{locale}/review (translation.review in scope) */
  markReviewed(input: TranslationReviewInput): Promise<TranslationTask>;
}
