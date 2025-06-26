import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { databaseConfig } from '../config/database.config';
import { DatabaseMonitorService } from '../monitoring/database-monitor.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isDatabaseConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private lastConnectionError: Error | null = null;
  private lastSuccessfulQuery: Date | null = null;

  constructor(
    @Optional() @Inject(DatabaseMonitorService) 
    private databaseMonitor?: DatabaseMonitorService
  ) {
    super({
      ...databaseConfig.prismaOptions,
      datasources: {
        db: {
          url: databaseConfig.poolUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
    });

    // Enable query logging using Prisma extensions (Prisma 4.7.0+)
    this.setupQueryLogging();
  }

  async onModuleInit() {
    await this.connectWithRetry();
    
    // Start connection pool monitoring
    if (this.databaseMonitor) {
      setInterval(() => this.updateConnectionPoolStats(), 30000); // Every 30 seconds
    }
  }

  private async connectWithRetry() {
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = this.maskConnectionString(dbUrl);
    
    this.logger.log(`Attempting database connection to: ${maskedUrl}`);

    while (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      
      try {
        this.logger.log(`Connection attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}...`);
        
        const startTime = Date.now();
        await this.$connect();
        const connectionTime = Date.now() - startTime;
        
        this.isDatabaseConnected = true;
        this.lastSuccessfulQuery = new Date();
        
        this.logger.log(`✅ Database connected successfully in ${connectionTime}ms`);
        this.logger.log(`   Connection type: ${this.getConnectionType()}`);
        
        // Verify connection with a simple query
        await this.$queryRaw`SELECT 1`;
        this.logger.log('✅ Database connection verified');
        
        return;
      } catch (error) {
        this.lastConnectionError = error as Error;
        this.isDatabaseConnected = false;
        
        this.logger.error(`Connection attempt ${this.connectionAttempts} failed:`, error.message);
        
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          const retryDelay = this.connectionAttempts * 2000; // Exponential backoff
          this.logger.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // All connection attempts failed
    this.logger.warn('⚠️  Database connection failed - running in mock mode');
    this.logger.warn('   To use a real database, configure DATABASE_URL correctly');
    this.logger.warn('   Expected format: postgresql://user:pass@host:port/db?pgbouncer=true');
    
    if (this.lastConnectionError) {
      this.analyzeConnectionError(this.lastConnectionError);
    }
  }

  private analyzeConnectionError(error: Error) {
    const errorMessage = error.message;
    
    if (errorMessage.includes('P1001') || errorMessage.includes('ECONNREFUSED')) {
      this.logger.error('🔍 Analysis: Cannot reach database server');
      this.logger.error('   - Check if DATABASE_URL is correct');
      this.logger.error('   - Verify network connectivity');
      this.logger.error('   - Ensure database server is running');
    } else if (errorMessage.includes('P1002')) {
      this.logger.error('🔍 Analysis: Database server reached but timed out');
      this.logger.error('   - Check firewall/security group settings');
      this.logger.error('   - Verify connection pooler configuration');
    } else if (errorMessage.includes('P1003')) {
      this.logger.error('🔍 Analysis: Database does not exist');
      this.logger.error('   - Ensure database is created in Supabase');
      this.logger.error('   - Check database name in connection string');
    } else if (errorMessage.includes('P1010') || errorMessage.includes('password authentication')) {
      this.logger.error('🔍 Analysis: Authentication failed');
      this.logger.error('   - Verify username and password');
      this.logger.error('   - Check if using correct connection string');
      this.logger.error('   - For Supabase, use pooler connection string');
    } else if (errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      this.logger.error('🔍 Analysis: SSL/TLS connection issue');
      this.logger.error('   - Add ?sslmode=require to connection string');
      this.logger.error('   - Or use ?pgbouncer=true for Supabase');
    }
  }

  private maskConnectionString(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.password = '****';
      return urlObj.toString();
    } catch {
      return url.replace(/:([^:@]+)@/, ':****@');
    }
  }

  async onModuleDestroy() {
    try {
      if (this.isDatabaseConnected) {
        await this.$disconnect();
        this.logger.log('🔌 Database disconnected');
      }
    } catch (error) {
      this.logger.error('Error during disconnect:', error);
    }
  }

  isDatabaseAvailable(): boolean {
    return this.isDatabaseConnected;
  }

  getConnectionStatus() {
    return {
      connected: this.isDatabaseConnected,
      lastError: this.lastConnectionError?.message || null,
      connectionAttempts: this.connectionAttempts,
      lastSuccessfulQuery: this.lastSuccessfulQuery,
      databaseUrl: this.maskConnectionString(process.env.DATABASE_URL || ''),
    };
  }

  private getConnectionType(): string {
    const url = process.env.DATABASE_URL || '';
    if (url.includes('pooler.supabase.com:6543')) return 'Transaction Pooler';
    if (url.includes('pooler.supabase.com:5432')) return 'Session Pooler';
    if (url.includes('db.') && url.includes(':5432')) return 'Direct Connection';
    return 'Unknown';
  }

  async healthCheck() {
    if (!this.isDatabaseConnected) {
      return {
        status: 'disconnected',
        message: 'Database not connected',
        error: this.lastConnectionError?.message,
      };
    }

    try {
      const startTime = Date.now();
      await this.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: `${queryTime}ms`,
        lastSuccessfulQuery: this.lastSuccessfulQuery,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private setupQueryLogging() {
    // Use middleware to log queries (Prisma 4.0+)
    if (this.databaseMonitor && process.env.NODE_ENV !== 'production') {
      // Note: Full query logging middleware requires Prisma extensions
      // For now, we'll use the simpler approach with manual timing
      this.logger.log('Query monitoring enabled for development');
    }
  }

  // Helper method to execute raw queries with monitoring
  async executeRawQuery<T = any>(query: string, params?: any[]): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = params 
        ? await this.$queryRawUnsafe(query, ...params)
        : await this.$queryRawUnsafe(query);
      
      const duration = Date.now() - startTime;
      
      if (this.databaseMonitor) {
        this.databaseMonitor.recordQuery(query, duration, params);
      }
      
      this.lastSuccessfulQuery = new Date();
      return result as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (this.databaseMonitor) {
        this.databaseMonitor.recordQuery(`[ERROR] ${query}`, duration, params);
      }
      
      throw error;
    }
  }

  // Helper to monitor connection pool (simulation for now)
  private updateConnectionPoolStats() {
    if (this.databaseMonitor && this.isDatabaseConnected) {
      // In a real implementation, you would get these from the database connection pool
      // For now, we'll simulate based on activity
      const active = Math.floor(Math.random() * 5);
      const total = 10;
      const idle = total - active;
      
      this.databaseMonitor.updateConnectionPoolStats(active, idle, total);
    }
  }
}