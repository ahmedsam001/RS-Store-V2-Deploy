import {
  ApiError,
  extractErrorCode,
  extractErrorDetails,
  extractErrorMessage,
  extractRequestId,
  extractValidationErrors,
  normalizeApiError,
} from '@/shared/api/api-error';
import { getCsrfToken } from '@/shared/api/csrf';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  csrfToken?: string | null;
  signal?: AbortSignal;
  cache?: RequestCache;
  headers?: Record<string, string | undefined>;
};

const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
);

const DEFAULT_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000);

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const method = options.method ?? 'GET';
  const headers = new Headers({ Accept: 'application/json' });
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    if (value) headers.set(name, value);
  }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = options.csrfToken ?? getCsrfToken();
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const signal = buildRequestSignal(options.signal);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: options.cache,
      signal,
      body: buildRequestBody(options.body, isFormData),
    });
  } catch (error) {
    throw normalizeApiError(
      error,
      'Unable to connect to server. Please check your internet connection.',
    );
  }

  const payload = response.status === 204 ? null : await readPayload(response);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: extractErrorMessage(payload, response.statusText || 'Request failed'),
      code: extractErrorCode(payload),
      requestId: extractRequestId(payload, response.headers),
      fieldErrors: extractValidationErrors(payload),
      details: extractErrorDetails(payload),
      raw: payload,
    });
  }

  return payload as TResponse;
}

function buildRequestSignal(externalSignal?: AbortSignal): AbortSignal | undefined {
  const timeoutMs = Number.isFinite(DEFAULT_REQUEST_TIMEOUT_MS)
    ? DEFAULT_REQUEST_TIMEOUT_MS
    : 15000;

  if (timeoutMs <= 0 && !externalSignal) return undefined;
  if (timeoutMs <= 0) return externalSignal;

  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    const timeoutSignal = (
      AbortSignal as typeof AbortSignal & { timeout: (milliseconds: number) => AbortSignal }
    ).timeout(timeoutMs);
    return mergeAbortSignals([externalSignal, timeoutSignal]);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  controller.signal.addEventListener('abort', () => window.clearTimeout(timeoutId), { once: true });

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), {
        once: true,
      });
    }
  }

  return controller.signal;
}

function mergeAbortSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const activeSignals = signals.filter((signal): signal is AbortSignal => Boolean(signal));
  if (activeSignals.length === 0) return undefined;
  if (activeSignals.length === 1) return activeSignals[0];

  const controller = new AbortController();
  const abort = (signal: AbortSignal) => controller.abort(signal.reason);

  for (const signal of activeSignals) {
    if (signal.aborted) {
      abort(signal);
      break;
    }
    signal.addEventListener('abort', () => abort(signal), { once: true });
  }

  return controller.signal;
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null) as Promise<unknown>;
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function buildRequestBody(body: unknown, isFormData: boolean): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  return isFormData ? (body as FormData) : JSON.stringify(body);
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}
