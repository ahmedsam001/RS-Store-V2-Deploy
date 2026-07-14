import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

import {
  getPrismaErrorCode,
  getPrismaErrorSummary,
  isRecoverableDatabaseError,
  PrismaService,
} from "../../infrastructure/database/prisma/prisma.service";
import { logStructured } from "../logging/structured-logger";

type FilteredPrismaError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientRustPanicError;

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  catch(exception: FilteredPrismaError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const code = getPrismaErrorCode(exception);
    const statusCode = this.resolveStatusCode(exception, code);

    if (isRecoverableDatabaseError(exception)) {
      const recovery = this.prisma.requestRuntimeRecovery(
        exception,
        "exception_filter",
      );
      void recovery?.catch((error) => {
        logStructured("error", "database_recovery_trigger_failed", {
          requestId: request.requestId,
          source: "exception_filter",
          errorSummary: getPrismaErrorSummary(error),
        });
      });
    }

    logStructured("error", "prisma_exception", {
      requestId: request.requestId,
      statusCode,
      code,
      errorSummary: getPrismaErrorSummary(exception),
      path: request.url,
    });

    response.status(statusCode).json({
      statusCode,
      message: this.resolveMessage(exception, code),
      error: HttpStatus[statusCode],
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }

  private resolveStatusCode(
    exception: FilteredPrismaError,
    code: string | undefined,
  ): number {
    if (isRecoverableDatabaseError(exception) || code === "P2028") {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }

    if (code === "P2002" || code === "P2003") {
      return HttpStatus.CONFLICT;
    }

    if (code === "P2025") {
      return HttpStatus.NOT_FOUND;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(
    exception: FilteredPrismaError,
    code: string | undefined,
  ): string {
    if (isRecoverableDatabaseError(exception) || code === "P2028") {
      return "Database temporarily unavailable. Please retry shortly";
    }

    if (code === "P2002") {
      return "A record with the same unique value already exists";
    }

    if (code === "P2003") {
      return "The request conflicts with a related record";
    }

    if (code === "P2025") {
      return "Requested record was not found";
    }

    return "Database request failed";
  }
}
