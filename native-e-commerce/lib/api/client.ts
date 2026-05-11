import { API_BASE_URL, STORE_ID } from '~/lib/config/env';
import { ApiError } from '~/lib/api/errors';
import { getAccessToken } from '~/lib/api/token';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const API_TIMEOUT_MS = 25000;

function joinUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${p}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T = Json>(
  path: string,
  init: RequestInit & { skipAuth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const { skipAuth, timeoutMs, headers: hdrs, ...rest } = init;
  const headers = new Headers(hdrs);
  headers.set('X-Store-Id', STORE_ID);
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (!headers.has('Content-Type') && rest.body != null && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const url = joinUrl(path);
  const controller = new AbortController();
  const deadlineMs = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : API_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), deadlineMs);

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('network_timeout', 'API request timed out', 0);
    }
    throw new ApiError('network_error', 'Unable to reach API server', 0);
  } finally {
    clearTimeout(timeout);
  }
  const body = await parseBody(res);

  if (!res.ok) {
    let code = `http_${res.status}`;
    let message = `HTTP ${res.status}`;
    let details: unknown;
    if (body && typeof body === 'object' && 'error' in body) {
      const e = (body as { error?: { code?: string; message?: string; details?: unknown } }).error;
      if (e?.code) code = String(e.code);
      if (e?.message) message = e.message;
      details = e?.details;
    } else if (typeof body === 'string' && body.length) {
      message = body.slice(0, 160);
    }
    throw new ApiError(code, message, res.status, details);
  }

  return body as T;
}

export function apiGet<T>(path: string, init?: RequestInit & { skipAuth?: boolean }) {
  return apiFetch<T>(path, { ...init, method: 'GET' });
}

export function apiPost<T>(
  path: string,
  json: unknown,
  init?: RequestInit & { skipAuth?: boolean; timeoutMs?: number }
) {
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    body: JSON.stringify(json),
  });
}

export function apiPut<T>(path: string, json: unknown, init?: RequestInit) {
  return apiFetch<T>(path, { ...init, method: 'PUT', body: JSON.stringify(json) });
}

export function apiPatch<T>(path: string, json: unknown, init?: RequestInit) {
  return apiFetch<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(json) });
}

export function apiDelete<T>(path: string, init?: RequestInit) {
  return apiFetch<T>(path, { ...init, method: 'DELETE' });
}
