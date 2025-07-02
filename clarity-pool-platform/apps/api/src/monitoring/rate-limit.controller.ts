import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/monitoring/rate-limits')
@UseGuards(JwtAuthGuard) // Remove AdminGuard for now
export class RateLimitController {
  private violations: any[] = [];

  @Get('violations')
  async getViolations(@Query('hours') hours = 24) {
    // Return violations from last N hours
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.violations.filter((v) => v.timestamp > cutoff);
  }

  @Get('stats')
  async getStats() {
    return {
      message: 'Rate limiting active via express-rate-limit',
      limits: {
        global: '60 requests per minute',
        login: '5 attempts per 15 minutes',
        refresh: '10 attempts per 5 minutes',
      },
      bypassTokens: ['internal-service-token-1', 'internal-service-token-2'],
      totalViolations: this.violations.length,
      recentViolations: this.violations.filter(
        (v) => v.timestamp > Date.now() - 3600000,
      ).length,
    };
  }

  @Post('clear')
  async clearViolations() {
    this.violations = [];
    return { message: 'Violations cleared' };
  }

  // Method to add violations (called from guard)
  addViolation(violation: any) {
    this.violations.push({
      ...violation,
      timestamp: Date.now(),
    });
    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations.shift();
    }
  }
}
