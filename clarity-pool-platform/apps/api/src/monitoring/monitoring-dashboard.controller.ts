import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from '../health/health-check.service';
import { DatabaseMonitorService } from './database-monitor.service';

@Controller('api/monitoring/dashboard')
export class MonitoringDashboardController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dbMonitor: DatabaseMonitorService,
  ) {}

  @Get()
  async getDashboard() {
    const [health, dbStats] = await Promise.all([
      this.healthCheckService.getHealthStatus(),
      this.dbMonitor.getMetrics(),
    ]);

    return {
      timestamp: new Date(),
      system: {
        status: health.status,
        uptime: health.uptime,
        version: health.version,
        environment: health.environment,
      },
      health: health.checks,
      database: {
        queries: dbStats.summary,
        slowQueries: dbStats.slowestQueries.slice(0, 5),
      },
      alerts: this.getActiveAlerts(health, dbStats),
    };
  }

  private getActiveAlerts(health: any, dbStats: any) {
    const alerts = [];

    if (health.status !== 'healthy') {
      alerts.push({
        level: 'critical',
        message: 'System health degraded',
        details: health.status,
      });
    }

    if (dbStats.summary.averageQueryTime > 500) {
      alerts.push({
        level: 'warning',
        message: 'High average query time',
        details: `${dbStats.summary.averageQueryTime}ms`,
      });
    }

    return alerts;
  }
}
