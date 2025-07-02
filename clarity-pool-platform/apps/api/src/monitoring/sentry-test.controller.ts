import { Controller, Get, Post } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Controller('api/monitoring/sentry')
export class SentryTestController {
  @Get('test-error')
  testError() {
    throw new Error('Test error for Sentry - this is intentional!');
  }

  @Post('test-logged-error')
  testLoggedError() {
    try {
      throw new Error('This error is caught and logged');
    } catch (error) {
      // Manual capture with context
      Sentry.captureException(error, {
        level: 'warning',
        tags: { test: true },
      });
      return { message: 'Error logged to Sentry' };
    }
  }
}
