import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';

@Controller('health')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'clarity-pool-api',
    };
  }

  @Get('detailed')
  async detailed() {
    return this.healthCheckService.getHealthStatus();
  }

  @Get('live')
  live() {
    // Kubernetes liveness probe - is the service running?
    return {
      status: 'live',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    // Kubernetes readiness probe - is the service ready to accept traffic?
    try {
      const health = await this.healthCheckService.getHealthStatus();
      const isReady = health.status !== 'unhealthy';

      return {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        details: isReady ? undefined : health.checks,
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('startup')
  async startup() {
    // Kubernetes startup probe - for slow-starting containers
    const uptime = this.healthCheckService.getUptime();
    const minimumUptime = 30000; // 30 seconds

    return {
      status: uptime > minimumUptime ? 'started' : 'starting',
      uptime: Math.floor(uptime / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
