import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { DatabaseMonitorService } from './database-monitor.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/monitoring/database')
export class DatabaseMonitorController {
  constructor(
    private databaseMonitor: DatabaseMonitorService,
    private prisma: PrismaService,
  ) {}

  @Get('stats')
  getStats() {
    return {
      queryMetrics: this.databaseMonitor.getStats(),
      connectionStatus: this.prisma.getConnectionStatus(),
      health: this.prisma.healthCheck(),
    };
  }

  @Get('slow-queries')
  getSlowQueries(@Query('limit') limit = '20') {
    return {
      slowQueries: this.databaseMonitor.getSlowQueries(parseInt(limit)),
      threshold: 1000, // Current threshold in ms
    };
  }

  @Post('set-threshold')
  @UseGuards(AuthGuard('jwt'))
  setSlowQueryThreshold(@Body('threshold') threshold: number) {
    this.databaseMonitor.setSlowQueryThreshold(threshold);
    return {
      message: 'Slow query threshold updated',
      newThreshold: threshold,
    };
  }

  @Post('test-performance')
  @UseGuards(AuthGuard('jwt'))
  async testPerformance() {
    const results = await this.databaseMonitor.runPerformanceTest();
    return {
      message: 'Performance test completed',
      results,
    };
  }

  @Post('test-slow-query')
  @UseGuards(AuthGuard('jwt'))
  async testSlowQuery() {
    // Simulate a slow query
    const startTime = Date.now();

    try {
      // This query is intentionally inefficient for testing
      await this.prisma.$queryRaw`
        SELECT COUNT(*) 
        FROM generate_series(1, 1000000) AS s(i)
        WHERE i % 2 = 0
      `;

      const duration = Date.now() - startTime;

      return {
        message: 'Slow query test completed',
        duration: `${duration}ms`,
        recorded: true,
      };
    } catch (error) {
      return {
        message: 'Slow query test failed',
        error: error.message,
      };
    }
  }

  @Get('connection-pool')
  getConnectionPoolStats() {
    const stats = this.databaseMonitor.getStats();
    return {
      pool: stats.connectionPoolStats,
      recommendations: this.getPoolRecommendations(stats.connectionPoolStats),
    };
  }

  private getPoolRecommendations(poolStats: any) {
    const recommendations = [];

    if (poolStats.active >= poolStats.total * 0.8) {
      recommendations.push(
        'Connection pool is nearly exhausted. Consider increasing pool size.',
      );
    }

    if (poolStats.idle === 0) {
      recommendations.push(
        'No idle connections available. This may cause request queuing.',
      );
    }

    if (poolStats.total < 10) {
      recommendations.push(
        'Pool size is small. Consider increasing for production workloads.',
      );
    }

    return recommendations;
  }
}
