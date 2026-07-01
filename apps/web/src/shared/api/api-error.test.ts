import { describe, expect, it, vi } from 'vitest';
import { ApiError, extractValidationErrors, toUserMessage } from '@/shared/api/api-error';
import { apiRequest } from '@/shared/api/http-client';

describe('ApiError utilities and http client parsing', () => {
  it('preserves status message request id and field errors from JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              message: ['name is required'],
              errors: { name: ['name is required'] },
              code: 'VALIDATION_ERROR',
              requestId: 'request-from-body',
            }),
            {
              status: 422,
              headers: { 'content-type': 'application/json' },
            },
          ),
      ),
    );

    try {
      await apiRequest('/broken');
      throw new Error('Expected apiRequest to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(422);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.requestId).toBe('request-from-body');
      expect(apiError.fieldErrors).toEqual({ name: ['name is required'] });
      expect(toUserMessage(apiError)).toBe('name is required');
    }
  });

  it('handles non JSON error responses and request id headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('Plain server failure', {
            status: 500,
            headers: { 'content-type': 'text/plain', 'x-request-id': 'request-from-header' },
          }),
      ),
    );

    try {
      await apiRequest('/plain-error');
      throw new Error('Expected apiRequest to throw');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(500);
      expect(apiError.message).toBe('Plain server failure');
      expect(apiError.requestId).toBe('request-from-header');
      expect(toUserMessage(apiError)).toBe('An unexpected error occurred. Please try again.');
    }
  });

  it('normalizes network failures to a friendly message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    try {
      await apiRequest('/network-error');
      throw new Error('Expected apiRequest to throw');
    } catch (error) {
      expect(toUserMessage(error)).toBe('Unable to connect to server. Please check your internet connection.');
    }
  });

  it('extracts validation errors from common backend shapes', () => {
    expect(extractValidationErrors({ fieldErrors: { phone: ['phone is invalid'] } })).toEqual({
      phone: ['phone is invalid'],
    });
    expect(extractValidationErrors({ message: ['name should not be empty'] })).toEqual({
      _form: ['name should not be empty'],
    });
  });
});
