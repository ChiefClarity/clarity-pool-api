import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  check() {
    return { 
      status: 'ok', 
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      database: this.prisma.isDatabaseAvailable(),
      version: '1.0.0',
      uptime: process.uptime(),
    };
  }
}