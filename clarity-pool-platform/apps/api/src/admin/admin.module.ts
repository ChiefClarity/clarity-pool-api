import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminReportsController } from './admin-reports.controller';
// import { AdminReportsService } from './admin-reports.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReportsModule } from '../reports/reports.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ReportsModule,
    PrismaModule,
    EmailModule,
    WeatherModule,
  ],
  controllers: [AdminReportsController],
  providers: [AdminGuard],
  exports: [AdminGuard],
})
export class AdminModule {}