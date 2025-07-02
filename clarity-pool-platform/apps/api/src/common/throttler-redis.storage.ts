import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { RateLimitConfig } from '../config/rate-limit.config';

@Injectable()
export class ThrottlerRedisStorage
  implements ThrottlerStorage, OnModuleInit, OnModuleDestroy
{
  private redis: Redis;
  private connected = false;

  constructor(private rateLimitConfig: RateLimitConfig) {}

  async onModuleInit() {
    try {
      this.redis = new Redis(this.rateLimitConfig.redis);
      await this.redis.ping();
      this.connected = true;
      console.log('✅ Rate limiting connected to Redis');
    } catch (error) {
      console.warn('⚠️ Rate limiting falling back to memory storage');
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async increment(
    key: string,
    ttl: number,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    if (!this.connected) {
      // Fallback to memory storage
      return this.memoryIncrement(key, ttl);
    }

    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, ttl);
    multi.ttl(key);

    const results = await multi.exec();

    if (!results || results.length < 3) {
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    return {
      totalHits: results[0][1] as number,
      timeToExpire: Math.max(0, results[2][1] as number),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  // Memory fallback implementation
  private memoryStorage = new Map<string, { count: number; expires: number }>();

  private memoryIncrement(key: string, ttl: number) {
    const now = Date.now();
    const expires = now + ttl * 1000;

    const existing = this.memoryStorage.get(key);
    if (existing && existing.expires > now) {
      existing.count++;
      return {
        totalHits: existing.count,
        timeToExpire: Math.ceil((existing.expires - now) / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    this.memoryStorage.set(key, { count: 1, expires });
    return {
      totalHits: 1,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
