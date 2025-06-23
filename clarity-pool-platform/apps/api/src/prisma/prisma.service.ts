import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private isDatabaseConnected = false;

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      console.log('DATABASE_URL:', process.env.DATABASE_URL);
      await this.$connect();
      this.isDatabaseConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      this.isDatabaseConnected = false;
      console.warn('⚠️  Database connection failed - running in mock mode');
      console.warn('   To use a real database, set DATABASE_URL environment variable');
      console.error('Connection error:', error.message);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.isDatabaseConnected) {
        await this.$disconnect();
        console.log('🔌 Database disconnected');
      }
    } catch (error) {
      // Ignore disconnect errors
    }
  }

  isDatabaseAvailable(): boolean {
    return this.isDatabaseConnected;
  }
}