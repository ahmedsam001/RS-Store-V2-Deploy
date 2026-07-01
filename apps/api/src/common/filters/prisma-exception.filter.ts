import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { logStructured } from '../logging/structured-logger';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = this.resolveStatusCode(exception.code);

    logStructured('error', 'prisma_exception', { requestId: request.requestId, statusCode, code: exception.code, path: request.url });

    response.status(statusCode).json({
      statusCode,
      message: this.resolveMessage(exception.code),
      error: HttpStatus[statusCode],
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }

  private resolveStatusCode(code: string): number {
    if (code === 'P2002') {
      return HttpStatus.CONFLICT;
    }

    if (code === 'P2025') {
      return HttpStatus.NOT_FOUND;
    }

    return HttpStatus.BAD_REQUEST;
  }

  private resolveMessage(code: string): string {
    if (code === 'P2002') {
      return 'A record with the same unique value already exists';
    }

    if (code === 'P2025') {
      return 'Requested record was not found';
    }

    return 'Database request failed';
  }
}
