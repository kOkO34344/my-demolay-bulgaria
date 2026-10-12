import { createApiClient } from '@/data/api/apiClient';
import { createApiRepositories } from '@/data/api/repositories';
import { toAppError } from '@/data/errors';
import { createMockRepositories } from '@/data/mock';
import type { Repositories } from '@/data/repositories';
import { env, type DataSource } from '@/lib/env';

/**
 * Picks the repository implementation once at startup:
 *   VITE_DATA_SOURCE=mock (default) → session-scoped mock repositories
 *   VITE_DATA_SOURCE=api            → FastAPI client (ApiUnavailableError until a backend exists)
 * Every method is wrapped so ANY rejection is a typed AppError (unexpected bugs become UnknownError).
 * Only the hooks in src/data/hooks use this; UI code never imports it.
 */

type AnyFn = (...args: never[]) => Promise<unknown>;

function wrapRepository<R extends object>(repository: R): R {
  const wrapped: Record<string, unknown> = {};
  for (const [name, member] of Object.entries(repository)) {
    if (typeof member !== 'function') {
      wrapped[name] = member;
      continue;
    }
    const method = member as AnyFn;
    wrapped[name] = async (...args: never[]) => {
      try {
        return await method.apply(repository, args);
      } catch (error) {
        throw toAppError(error);
      }
    };
  }
  return wrapped as R;
}

/** Wraps every repository method so rejections are always AppError instances. */
export function withTypedErrors(repositories: Repositories): Repositories {
  const result = {} as Record<keyof Repositories, unknown>;
  for (const key of Object.keys(repositories) as Array<keyof Repositories>) {
    result[key] = wrapRepository(repositories[key]);
  }
  return result as Repositories;
}

export function createRepositories(source: DataSource = env.dataSource): Repositories {
  const raw =
    source === 'api'
      ? createApiRepositories(createApiClient({ baseUrl: env.apiBaseUrl }))
      : createMockRepositories();
  return withTypedErrors(raw);
}

export const repositories: Repositories = createRepositories();
