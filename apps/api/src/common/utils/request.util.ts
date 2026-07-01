import { Request } from 'express';

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const segment of String(cookieHeader ?? '').split(';')) {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}

export function clientIp(request: Request): string | undefined {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return request.ip || request.socket.remoteAddress || undefined;
}

export function userAgent(request: Request): string | undefined {
  const header = request.headers['user-agent'];
  return typeof header === 'string' && header.trim() ? header.slice(0, 1024) : undefined;
}

export function requestPath(request: Request): string {
  return request.path || request.url.split('?')[0] || '/';
}
