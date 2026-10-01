import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const detail =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "message" in detail
          ? detail.message
          : "Unable to process your request.";
    if (status >= 500)
      this.logger.error(
        exception instanceof Error ? exception.message : "Request failed",
      );
    response
      .status(status)
      .json({ status: false, message, statusCode: status });
  }
}
