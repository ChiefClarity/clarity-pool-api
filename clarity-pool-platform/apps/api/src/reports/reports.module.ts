import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { PoolbrainModule } from '../poolbrain/poolbrain.module';
import { EmailModule } from '../email/email.module';
import { WeatherModule } from '../weather/weather.module';
import { ClaudeAnalysisModule } from '../claude-analysis/claude-analysis.module';
import { WeeklyReportService } from './weekly-report.service';
import { ReportScheduler } from './report.scheduler';
import { HealthScoreCalculator } from './health-score.calculator';
import { ChemistryTrendAnalyzer } from './chemistry-trend.analyzer';
import { ReportWebhookController } from './report-webhook.controller';
import { WeeklyReportTemplate } from './templates/weekly-report.template';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    PoolbrainModule,
    EmailModule,
    WeatherModule,
    ClaudeAnalysisModule,
  ],
  controllers: [ReportWebhookController],
  providers: [
    WeeklyReportService,
    ReportScheduler,
    HealthScoreCalculator,
    ChemistryTrendAnalyzer,
    WeeklyReportTemplate,
  ],
  exports: [WeeklyReportService, ReportScheduler, WeeklyReportTemplate],
})
export class ReportsModule {}
