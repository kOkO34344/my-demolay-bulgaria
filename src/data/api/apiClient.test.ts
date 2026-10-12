import { describe, expect, it, vi } from 'vitest';

import {
  ApiUnavailableError,
  ConflictError,
  ForbiddenError,
  NetworkError,
  RateLimitedError,
  ValidationError,
} from '@/data/errors';
import { createRepositories } from '@/data/registry';

import { buildQueryString, createApiClient } from './apiClient';

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('API client (FastAPI migration path)', () => {
  it('fails clearly when no backend is configured', async () => {
    const api = createApiClient({ baseUrl: null });
    await expect(api.get('/posts')).rejects.toBeInstanceOf(ApiUnavailableError);
    const repos = createRepositories('api');
    await expect(repos.posts.list()).rejects.toMatchObject({
      code: 'api_unavailable',
      endpoint: 'GET /posts/feed',
    });
  });

  it('sends cookie credentials, CSRF header and snake_case query params', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse(200, [])));
    const api = createApiClient({
      baseUrl: 'https://api.test/api/v1',
      fetchImpl,
      getCsrfToken: () => 'csrf-1',
    });
    await api.post('/posts', { title: 'x' });
    await api.get('/events', { includeUnpublished: true, chapterId: undefined, when: 'upcoming' });
    const [postUrl, postInit] = fetchImpl.mock.calls[0] ?? [];
    expect(postUrl).toBe('https://api.test/api/v1/posts');
    expect(postInit).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': 'csrf-1' },
    });
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'https://api.test/api/v1/events?include_unpublished=true&when=upcoming',
    );
    expect(buildQueryString({ a: ['x', 'y'] })).toBe('?a=x&a=y');
  });

  it('maps problem responses to typed errors', async () => {
    const cases: Array<[Response, unknown]> = [
      [jsonResponse(403, { reason: 'permission_denied' }), ForbiddenError],
      [jsonResponse(409, { reason_key: 'events.errors.full' }), ConflictError],
      [jsonResponse(422, { field_errors: { title: 'validation.required' } }), ValidationError],
      [jsonResponse(429, {}, { 'Retry-After': '30' }), RateLimitedError],
    ];
    for (const [response, ErrorType] of cases) {
      const api = createApiClient({
        baseUrl: 'https://api.test',
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
      });
      await expect(api.get('/x')).rejects.toBeInstanceOf(ErrorType);
    }
    const offline = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')),
    });
    await expect(offline.get('/x')).rejects.toBeInstanceOf(NetworkError);
  });
});
