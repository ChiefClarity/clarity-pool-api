import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export interface QueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

export interface DatabaseStats {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: QueryMetric[];
  queryCountByType: Record<string, number>;
  connectionPoolStats: {
    active: number;
    idle: number;
    total: number;
  };
  lastResetTime: Date;
}

@Injectable()
export class DatabaseMonitorService {
  private queries: QueryMetric[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxStoredQueries = 1000;
  private queryCountByType: Record<string, number> = {};
  private resetTime = new Date();

  // Connection pool simulation (replace with actual pool stats)
  private connectionPoolStats = {
    active: 0,
    idle: 10,
    total: 10,
  };

  constructor() {
    // Reset stats every hour
    setInterval(() => this.resetStats(), 60 * 60 * 1000);
  }

  recordQuery(query: string, duration: number, params?: any[]) {
    const metric: QueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      params: this.sanitizeParams(params),
    };

    this.queries.push(metric);

    // Keep only recent queries
    if (this.queries.length > this.maxStoredQueries) {
      this.queries.shift();
    }

    // Track query type
    const queryType = this.getQueryType(query);
    this.queryCountByType[queryType] = (this.queryCountByType[queryType] || 0) + 1;

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected (${duration}ms):`, {
        query: metric.query,
        duration,
        timestamp: metric.timestamp,
      });

      // Send to Sentry for critical slow queries
      if (duration > this.slowQueryThreshold * 5) {
        Sentry.captureMessage('Critical slow query detected', {
          level: 'warning',
          extra: {
            query: metric.query,
            duration,
            params: metric.params,
          },
        });
      }
    }
  }

  getStats(): DatabaseStats {
    const now = Date.now();
    const recentQueries = this.queries.filter(
      q => now - q.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    const totalQueries = recentQueries.length;
    const averageQueryTime = totalQueries > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / totalQueries
      : 0;

    const slowQueries = recentQueries
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slow queries

    return {
      totalQueries,
      averageQueryTime,
      slowQueries,
      queryCountByType: { ...this.queryCountByType },
      connectionPoolStats: { ...this.connectionPoolStats },
      lastResetTime: this.resetTime,
    };
  }

  getSlowQueries(limit = 20): QueryMetric[] {
    return this.queries
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  updateConnectionPoolStats(active: number, idle: number, total: number) {
    this.connectionPoolStats = { active, idle, total };

    // Alert if connection pool is exhausted
    if (active >= total * 0.9) {
      Sentry.captureMessage('Database connection pool near exhaustion', {
        level: 'warning',
        extra: { active, idle, total },
      });
    }
  }

  setSlowQueryThreshold(threshold: number) {
    this.slowQueryThreshold = threshold;
  }

  private sanitizeQuery(query: string): string {
    // Remove extra whitespace and normalize
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit length
  }

  private sanitizeParams(params?: any[]): any[] | undefined {
    if (!params) return undefined;
    
    // Mask sensitive data
    return params.map(param => {
      if (typeof param === 'string' && param.length > 50) {
        return '[TRUNCATED]';
      }
      return param;
    });
  }

  private getQueryType(query: string): string {
    const normalized = query.toUpperCase().trim();
    
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    if (normalized.startsWith('BEGIN')) return 'TRANSACTION';
    if (normalized.startsWith('COMMIT')) return 'TRANSACTION';
    if (normalized.startsWith('ROLLBACK')) return 'TRANSACTION';
    
    return 'OTHER';
  }

  private resetStats() {
    this.queries = [];
    this.queryCountByType = {};
    this.resetTime = new Date();
    console.log('Database monitoring stats reset');
  }

  // Performance testing helpers
  async runPerformanceTest() {
    const results = {
      queryLatencies: [] as number[],
      connectionPoolTest: null as any,
      stressTestResults: null as any,
    };

    // Simulate various query latencies
    const testQueries = [
      { query: 'SELECT * FROM technicians WHERE id = $1', duration: 50 },
      { query: 'SELECT * FROM offers JOIN technicians ON ...', duration: 150 },
      { query: 'INSERT INTO audit_logs ...', duration: 30 },
      { query: 'UPDATE technicians SET last_login = NOW() WHERE id = $1', duration: 80 },
      { query: 'SELECT COUNT(*) FROM offers WHERE status = $1', duration: 2500 }, // Slow query
    ];

    for (const test of testQueries) {
      this.recordQuery(test.query, test.duration, ['test-param']);
      results.queryLatencies.push(test.duration);
    }

    // Simulate connection pool stress
    const poolStates = [
      { active: 2, idle: 8, total: 10 },
      { active: 5, idle: 5, total: 10 },
      { active: 8, idle: 2, total: 10 },
      { active: 9, idle: 1, total: 10 }, // Near exhaustion
    ];

    for (const state of poolStates) {
      this.updateConnectionPoolStats(state.active, state.idle, state.total);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    results.connectionPoolTest = poolStates;
    results.stressTestResults = this.getStats();

    return results;
  }

  getMetrics() {
    const stats = this.getStats();
    return {
      summary: {
        totalQueries: stats.totalQueries,
        averageQueryTime: Math.round(stats.averageQueryTime),
        slowQueryCount: stats.slowQueries.length,
      },
      slowestQueries: stats.slowQueries,
      queryTypes: stats.queryCountByType,
      connectionPool: stats.connectionPoolStats,
    };
  }
}