import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SentryConfig {
  constructor(private configService: ConfigService) {}

  getDsn(): string {
    return this.configService.get(
      'SENTRY_DSN',
      'https://0bb3211b190970a04037ee7d32c3caa6@o4509565617708864.ingest.us.sentry.io/4509565741367296',
    );
  }

  getEnvironment(): string {
    return this.configService.get('NODE_ENV', 'development');
  }
}
