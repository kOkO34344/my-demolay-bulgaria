import {
  ApiUnavailableError,
  ConflictError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  UnknownError,
  ValidationError,
  type ForbiddenReason,
  type UnauthorizedReason,
} from '@/data/errors';

/**
 * Minimal fetch client for the future FastAPI backend (/api/v1).
 *  - Cookie session: `credentials: 'include'`; CSRF token header on unsafe methods.
 *  - Query keys are converted to snake_case; JSON bodies stay camelCase (Pydantic models use an
 *    alias generator `to_camel` with `populate_by_name=True`).
 *  - FastAPI problem responses are mapped to the typed errors in '@/data/errors'.
 * In the prototype no base URL is configured, so every call fails with ApiUnavailableError.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  query?: object;
  body?: unknown;
}

export interface ApiClientOptions {
  /** e.g. https://api.demolay.bg/api/v1 — null in the prototype. */
  baseUrl: string | null;
  /** Reads the CSRF token (double-submit cookie) for unsafe requests. */
  getCsrfToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  request<T>(req: ApiRequest): Promise<T>;
  get<T>(path: string, query?: object): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

const toSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function buildQueryString(query?: object): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query) as Array<[string, QueryValue | QueryValue[]]>) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue;
      params.append(toSnake(key), String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

interface ProblemBody {
  detail?: unknown;
  reason?: string;
  reason_key?: string;
  field_errors?: Record<string, string>;
  entity_type?: string;
  entity_id?: string;
}

async function toError(response: Response, endpoint: string): Promise<Error> {
  let body: ProblemBody = {};
  try {
    body = (await response.json()) as ProblemBody;
  } catch {
    /* non-JSON error body */
  }
  switch (response.status) {
    case 401:
      return new UnauthorizedError(
        (body.reason as UnauthorizedReason | undefined) ?? 'session_expired',
      );
    case 403:
      return new ForbiddenError(
        (body.reason as ForbiddenReason | undefined) ?? 'permission_denied',
      );
    case 404:
      return new NotFoundError(body.entity_type ?? 'resource', body.entity_id ?? endpoint);
    case 409:
      return new ConflictError(body.reason_key);
    case 422:
      return new ValidationError(body.field_errors ?? {});
    case 429:
      return new RateLimitedError(Number(response.headers.get('Retry-After') ?? '60'));
    case 503:
      return new ApiUnavailableError(endpoint);
    default:
      return new UnknownError(new Error(`HTTP ${response.status} ${endpoint}`));
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const getCsrf = options.getCsrfToken ?? (() => readCookie('mdb_csrf'));

  async function request<T>({ method, path, query, body }: ApiRequest): Promise<T> {
    const endpoint = `${method} ${path}`;
    if (!options.baseUrl) throw new ApiUnavailableError(endpoint);
    const doFetch = options.fetchImpl ?? fetch;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') {
      const csrf = getCsrf();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    let response: Response;
    try {
      response = await doFetch(`${options.baseUrl}${path}${buildQueryString(query)}`, {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new NetworkError(error instanceof Error ? error.message : undefined);
    }
    if (!response.ok) throw await toError(response, endpoint);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    request,
    get: (path, query) => request({ method: 'GET', path, query }),
    post: (path, body) => request({ method: 'POST', path, body }),
    put: (path, body) => request({ method: 'PUT', path, body }),
    patch: (path, body) => request({ method: 'PATCH', path, body }),
    delete: (path) => request({ method: 'DELETE', path }),
  };
}
