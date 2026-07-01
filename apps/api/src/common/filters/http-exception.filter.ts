import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logStructured } from '../logging/structured-logger';

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const normalizedResponse = this.normalizeResponse(exceptionResponse, statusCode);

    if (statusCode >= 500) {
      logStructured('error', 'http_exception', { requestId: request.requestId, statusCode, path: request.url, message: exception.message });
    }

    response.status(statusCode).json({
      ...normalizedResponse,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }

  private normalizeResponse(response: string | object, statusCode: number): ErrorResponse {
    if (typeof response === 'string') {
      return {
        statusCode,
        message: response,
        error: HttpStatus[statusCode],
      };
    }

    const body = response as Partial<ErrorResponse>;
    return {
      statusCode,
      message: body.message ?? 'Request failed',
      error: body.error,
    };
  }
}
