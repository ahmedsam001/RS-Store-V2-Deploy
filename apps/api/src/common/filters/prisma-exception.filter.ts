import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import {
  getPrismaErrorCode,
  isTransientDatabaseError,
  isTransientDatabaseErrorCode,
  PrismaService,
} from '../../infrastructure/database/prisma/prisma.service';
import { logStructured } from '../logging/structured-logger';

type FilteredPrismaError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientInitializationError;

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientInitializationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  catch(exception: FilteredPrismaError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const code = getPrismaErrorCode(exception);
    const statusCode = this.resolveStatusCode(code);

    if (isTransientDatabaseError(exception)) {
      void this.prisma.requestRuntimeRecovery(exception, 'exception_filter');
    }

    logStructured('error', 'prisma_exception', {
      requestId: request.requestId,
      statusCode,
      code,
      path: request.url,
    });

    response.status(statusCode).json({
      statusCode,
      message: this.resolveMessage(code),
      error: HttpStatus[statusCode],
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }

  private resolveStatusCode(code: string | undefined): number {
    if (code === 'P2002') {
      return HttpStatus.CONFLICT;
    }

    if (code === 'P2025') {
      return HttpStatus.NOT_FOUND;
    }

    if (isTransientDatabaseErrorCode(code)) {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }

    return HttpStatus.BAD_REQUEST;
  }

  private resolveMessage(code: string | undefined): string {
    if (code === 'P2002') {
      return 'A record with the same unique value already exists';
    }

    if (code === 'P2025') {
      return 'Requested record was not found';
    }

    if (isTransientDatabaseErrorCode(code)) {
      return 'Database temporarily unavailable. Please retry shortly';
    }

    return 'Database request failed';
  }
}
