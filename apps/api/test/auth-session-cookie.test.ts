import test from 'node:test';
import assert from 'node:assert/strict';
import type { CookieOptions, Response } from 'express';
import { AuthSessionService } from '../src/modules/auth/services/auth-session.service';

type CookieCall = {
  name: string;
  value?: string;
  options: CookieOptions;
};

type AuthSessionCookieService = {
  setAuthCookies(
    response: Response,
    sessionToken: string,
    csrfToken: string,
    maxAgeSeconds: number,
  ): void;
  clearAuthCookies(response: Response): void;
};

function buildService(config: Record<string, unknown>): AuthSessionCookieService {
  const configService = {
    get<T>(key: string): T | undefined {
      return config[key] as T | undefined;
    },
    getOrThrow<T>(key: string): T {
      if (!(key in config)) {
        throw new Error(`Missing config key ${key}`);
      }

      return config[key] as T;
    },
  };

  return new AuthSessionService({} as never, configService as never) as unknown as AuthSessionCookieService;
}

function buildResponse() {
  const cookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];
  const response = {
    cookie(name: string, value: string, options: CookieOptions) {
      cookies.push({ name, value, options });
      return response;
    },
    clearCookie(name: string, options: CookieOptions) {
      clearedCookies.push({ name, options });
      return response;
    },
  } as unknown as Response;

  return { response, cookies, clearedCookies };
}

test('auth cookies use configured rs-store domain when set and cleared', () => {
  const service = buildService({
    SESSION_COOKIE_NAME: 'rs_session',
    CSRF_COOKIE_NAME: 'rs_csrf',
    COOKIE_SECURE: true,
    COOKIE_DOMAIN: '.rs-store.me',
  });
  const { response, cookies, clearedCookies } = buildResponse();

  service.setAuthCookies(response, 'session-token', 'csrf-token', 60);
  service.clearAuthCookies(response);

  assert.deepEqual(cookies, [
    {
      name: 'rs_session',
      value: 'session-token',
      options: {
        domain: '.rs-store.me',
        httpOnly: true,
        maxAge: 60000,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
    },
    {
      name: 'rs_csrf',
      value: 'csrf-token',
      options: {
        domain: '.rs-store.me',
        httpOnly: false,
        maxAge: 60000,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
    },
  ]);
  assert.deepEqual(clearedCookies, [
    {
      name: 'rs_session',
      options: {
        domain: '.rs-store.me',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
    },
    {
      name: 'rs_csrf',
      options: {
        domain: '.rs-store.me',
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
    },
  ]);
});

test('auth cookies omit domain when COOKIE_DOMAIN is not configured', () => {
  const service = buildService({
    SESSION_COOKIE_NAME: 'rs_session',
    CSRF_COOKIE_NAME: 'rs_csrf',
    COOKIE_SECURE: false,
  });
  const { response, cookies, clearedCookies } = buildResponse();

  service.setAuthCookies(response, 'session-token', 'csrf-token', 60);
  service.clearAuthCookies(response);

  for (const call of [...cookies, ...clearedCookies]) {
    assert.equal('domain' in call.options, false);
    assert.equal(call.options.path, '/');
    assert.equal(call.options.sameSite, 'lax');
    assert.equal(call.options.secure, false);
  }
});
