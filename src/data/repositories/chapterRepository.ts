import type { Chapter, ChapterDetail, ChapterInput, ChapterSummary, ID } from '@/domain';

export interface ChapterRepository {
  /** GET /api/v1/chapters — all chapters (names are public to members). */
  list(): Promise<Chapter[]>;

  /** GET /api/v1/chapters/{chapter_id} — details + leaders (chapter.read in scope). */
  get(chapterId: ID): Promise<ChapterDetail>;

  /** GET /api/v1/chapters/summaries — operational summary per chapter in the subject's scope. */
  summaries(): Promise<ChapterSummary[]>;

  /** POST /api/v1/chapters (chapter.update at national/system scope). */
  create(input: ChapterInput): Promise<Chapter>;

  /** PUT /api/v1/chapters/{chapter_id} (chapter.update in scope). */
  update(chapterId: ID, input: ChapterInput): Promise<Chapter>;
}
