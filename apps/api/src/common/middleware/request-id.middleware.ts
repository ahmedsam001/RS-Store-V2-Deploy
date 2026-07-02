import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { logStructured } from '../logging/structured-logger';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const inbound = Array.isArray(request.headers['x-request-id'])
    ? request.headers['x-request-id'][0]
    : request.headers['x-request-id'];
  const requestId =
    typeof inbound === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(inbound)
      ? inbound
      : randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  const startedAt = Date.now();
  response.on('finish', () => {
    logStructured('info', 'request_completed', {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}
