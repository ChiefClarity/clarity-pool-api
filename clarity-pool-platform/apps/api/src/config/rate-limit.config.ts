import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RateLimitTier {
  ttl: number;
  limit: number;
}

@Injectable()
export class RateLimitConfig {
  constructor(private configService: ConfigService) {}

  get tiers(): Record<string, RateLimitTier> {
    return {
      // Authentication endpoints - strict
      auth: { ttl: 900, limit: 5 }, // 5 attempts per 15 minutes
      
      // General API - moderate
      api: { ttl: 60, limit: 60 }, // 60 requests per minute
      
      // Read operations - lenient
      read: { ttl: 60, limit: 120 }, // 120 requests per minute
      
      // Write operations - strict
      write: { ttl: 60, limit: 30 }, // 30 requests per minute
      
      // File uploads - very strict
      upload: { ttl: 3600, limit: 10 }, // 10 uploads per hour
    };
  }

  get redis() {
    return {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
    };
  }

  get bypassTokens(): string[] {
    // Internal service tokens that bypass rate limiting
    const tokens = this.configService.get('RATE_LIMIT_BYPASS_TOKENS', '');
    return tokens.split(',').filter(Boolean);
  }
}