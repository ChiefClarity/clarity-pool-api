import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class BookingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BookingExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log to Sentry for server errors
    if (status >= 500) {
      Sentry.captureException(exception, {
        tags: {
          module: 'booking',
          endpoint: request.url,
          method: request.method,
        },
        user: request['user'] ? {
          id: request['user'].id,
          email: request['user'].email,
        } : undefined,
      });
    }

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      requestId: request.headers['x-request-id'] as string,
    });
  }
}