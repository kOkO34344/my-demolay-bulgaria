import type { DownloadTicket, ID, ResourceInput, ResourceListQuery, ResourceView } from '@/domain';

/** Resource library (metadata only; files are simulated). */
export interface ResourceRepository {
  /** GET /api/v1/resources?category=&language=&search=&scope=&chapter_id=&include_archived= */
  list(query?: ResourceListQuery): Promise<ResourceView[]>;

  /** GET /api/v1/resources/{resource_id} */
  get(resourceId: ID): Promise<ResourceView>;

  /** POST /api/v1/resources (multipart upload in production; metadata only here). */
  create(input: ResourceInput): Promise<ResourceView>;

  /** PUT /api/v1/resources/{resource_id} — metadata, category, language … */
  update(resourceId: ID, input: ResourceInput): Promise<ResourceView>;

  /** POST /api/v1/resources/{resource_id}/archive */
  archive(resourceId: ID): Promise<ResourceView>;

  /** POST /api/v1/resources/{resource_id}/restore */
  restore(resourceId: ID): Promise<ResourceView>;

  /** GET /api/v1/resources/{resource_id}/download → signed URL in production; simulated ticket here. */
  simulateDownload(resourceId: ID): Promise<DownloadTicket>;
}
