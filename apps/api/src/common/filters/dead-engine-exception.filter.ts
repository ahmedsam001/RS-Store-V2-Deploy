import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import {
  getPrismaErrorName,
  getPrismaErrorSummary,
  isDeadPrismaEngineError,
  PrismaService,
} from "../../infrastructure/database/prisma/prisma.service";
import { logStructured } from "../logging/structured-logger";
import { HttpExceptionFilter } from "./http-exception.filter";
import { PrismaExceptionFilter } from "./prisma-exception.filter";

function readRequestId(request: Request): string | undefined {
  const requestWithId = request as Request & { requestId?: unknown };
  return typeof requestWithId.requestId === "string"
    ? requestWithId.requestId
    : undefined;
}

function isPrismaException(
  exception: unknown,
): exception is
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientRustPanicError {
  return (
    exception instanceof Prisma.PrismaClientKnownRequestError ||
    exception instanceof Prisma.PrismaClientUnknownRequestError ||
    exception instanceof Prisma.PrismaClientInitializationError ||
    exception instanceof Prisma.PrismaClientRustPanicError
  );
}

@Catch()
export class DeadEngineExceptionFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      new HttpExceptionFilter().catch(exception, host);
      return;
    }

    if (isPrismaException(exception)) {
      new PrismaExceptionFilter(this.prisma).catch(exception, host);
      return;
    }

    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = readRequestId(request);

    if (isDeadPrismaEngineError(exception)) {
      const recovery = this.prisma.requestRuntimeRecovery(
        exception,
        "exception_filter",
      );
      void recovery?.catch((error) => {
        logStructured("error", "database_recovery_trigger_failed", {
          requestId: requestId,
          source: "exception_filter",
          errorSummary: getPrismaErrorSummary(error),
        });
      });

      const statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      logStructured("error", "prisma_dead_engine_exception", {
        requestId: requestId,
        statusCode,
        errorSummary: getPrismaErrorSummary(exception),
        path: request.url,
      });

      response.status(statusCode).json({
        statusCode,
        message: "Database temporarily unavailable. Please retry shortly",
        error: HttpStatus[statusCode],
        path: request.url,
        timestamp: new Date().toISOString(),
        requestId: requestId,
      });
      return;
    }

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    logStructured("error", "unhandled_exception", {
      requestId: requestId,
      statusCode,
      errorName: getPrismaErrorName(exception),
      path: request.url,
    });

    response.status(statusCode).json({
      statusCode,
      message: "Internal server error",
      error: HttpStatus[statusCode],
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: requestId,
    });
  }
}
