export type ApiFieldErrors = Record<string, string[]>;

export type ApiErrorOptions = {
  status: number;
  message: string;
  code?: string;
  requestId?: string;
  fieldErrors?: ApiFieldErrors;
  details?: unknown;
  raw?: unknown;
};

const DEFAULT_API_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly fieldErrors?: ApiFieldErrors;
  readonly details?: unknown;
  readonly raw?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message || DEFAULT_API_ERROR_MESSAGE);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.fieldErrors = options.fieldErrors;
    this.details = options.details;
    this.raw = options.raw;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function normalizeApiError(
  error: unknown,
  fallbackMessage = DEFAULT_API_ERROR_MESSAGE,
): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof DOMException) {
    if (error.name === 'TimeoutError') {
      return new ApiError({
        status: 0,
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out. Please try again.',
        raw: error,
      });
    }

    if (error.name === 'AbortError') {
      return new ApiError({
        status: 0,
        code: 'REQUEST_ABORTED',
        message: 'Request was cancelled',
        raw: error,
      });
    }
  }

  if (error instanceof TypeError) {
    return new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to server. Please check your internet connection.',
      raw: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({ status: 0, message: error.message || fallbackMessage, raw: error });
  }

  return new ApiError({ status: 0, message: fallbackMessage, raw: error });
}

export function toUserMessage(error: unknown, fallbackMessage = DEFAULT_API_ERROR_MESSAGE): string {
  const apiError = normalizeApiError(error, fallbackMessage);
  const message = apiError.message.trim();

  if (message && isSpecificUserFacingMessage(message)) {
    return translateKnownMessage(message);
  }

  if (apiError.fieldErrors && Object.keys(apiError.fieldErrors).length > 0) {
    return firstFieldError(apiError.fieldErrors) ?? statusMessage(apiError.status, fallbackMessage);
  }

  if (
    message &&
    apiError.status > 0 &&
    apiError.status < 500 &&
    !isGenericEnglishMessage(message)
  ) {
    return translateKnownMessage(message);
  }

  return statusMessage(apiError.status, fallbackMessage, apiError.code);
}

export function extractValidationErrors(payload: unknown): ApiFieldErrors | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const candidate = payload.errors ?? payload.fieldErrors ?? payload.validationErrors;
  if (isFieldErrors(candidate)) {
    return candidate;
  }

  const message = payload.message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return { _form: message };
  }

  return undefined;
}

export function extractErrorMessage(
  payload: unknown,
  fallbackMessage = DEFAULT_API_ERROR_MESSAGE,
): string {
  if (!isRecord(payload)) {
    return fallbackMessage;
  }

  const message = payload.message;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(', ');
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  return fallbackMessage;
}

export function extractErrorCode(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const code = payload.code ?? payload.errorCode;
  return typeof code === 'string' && code.trim() ? code.trim() : undefined;
}

export function extractErrorDetails(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return undefined;
  }

  return payload.details ?? payload.meta ?? undefined;
}

export function extractRequestId(payload: unknown, headers?: Headers): string | undefined {
  if (isRecord(payload) && typeof payload.requestId === 'string' && payload.requestId.trim()) {
    return payload.requestId.trim();
  }

  const headerValue = headers?.get('x-request-id') ?? headers?.get('X-Request-Id');
  return headerValue?.trim() || undefined;
}

function statusMessage(status: number, fallbackMessage: string, code?: string): string {
  if (code === 'NETWORK_ERROR')
    return 'Unable to connect to server. Please check your internet connection.';
  if (code === 'REQUEST_ABORTED') return 'Request was cancelled';
  if (code === 'REQUEST_TIMEOUT') return 'Request timed out. Please try again.';

  switch (status) {
    case 0:
      return fallbackMessage;
    case 400:
      return 'Invalid input data';
    case 401:
      return 'Please sign in to continue';
    case 403:
      return 'You do not have permission to perform this action';
    case 404:
      return 'Required data not found';
    case 409:
      return 'Data conflict occurred. Please try again';
    case 422:
      return 'Please review required fields';
    default:
      return status >= 500 ? 'An unexpected error occurred. Please try again.' : fallbackMessage;
  }
}

function translateKnownMessage(message: string): string {
  if (/^Only \d+ left for this option\.?$/i.test(message)) {
    return message;
  }

  if (/stock|quantity|available|out of stock|insufficient/i.test(message)) {
    return 'Requested quantity is not available';
  }

  if (/variant|option|size|color/i.test(message)) {
    return 'Please select size or color first';
  }

  if (/not found/i.test(message)) {
    return 'Required data not found';
  }

  if (/unauthorized|log in|login/i.test(message)) {
    return 'Please sign in to continue';
  }

  if (/csrf token is required|security token expired|csrf/i.test(message)) {
    return 'Your security token expired. Refresh the page and try again.';
  }

  if (/forbidden|permission/i.test(message)) {
    return 'You do not have permission to perform this action';
  }

  return message;
}

function firstFieldError(fieldErrors: ApiFieldErrors): string | undefined {
  for (const messages of Object.values(fieldErrors)) {
    const first = messages.find((message) => message.trim());
    if (first) return translateKnownMessage(first);
  }

  return undefined;
}

function isSpecificUserFacingMessage(message: string): boolean {
  return (
    /[\u0600-\u06FF]/.test(message) ||
    /stock|quantity|available|variant|option|size|color|unauthorized|forbidden|csrf|security token|not found/i.test(
      message,
    )
  );
}

function isGenericEnglishMessage(message: string): boolean {
  return /^(Request failed|Bad Request|Unauthorized|Forbidden|Not Found|Internal Server Error)$/i.test(
    message,
  );
}

function isFieldErrors(value: unknown): value is ApiFieldErrors {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
