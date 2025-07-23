import { IsString, IsBoolean, IsOptional, IsEmail, IsArray, IsEnum, IsDateString, IsNumber, Min, Max, IsUUID, ValidateNested, IsObject, Matches } from 'class-validator';
import { Type } from 'class-transformer';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// Using type annotations instead of decorators for now

export class EnabledFeaturesDto {
  // @ApiProperty({ description: 'Enable chemistry analysis in reports' })
  @IsBoolean()
  chemistryAnalysis: boolean;

  // @ApiProperty({ description: 'Enable weather integration in reports' })
  @IsBoolean()
  weatherIntegration: boolean;

  // @ApiProperty({ description: 'Enable AI insights in reports' })
  @IsBoolean()
  aiInsights: boolean;

  // @ApiProperty({ description: 'Enable equipment status in reports' })
  @IsBoolean()
  equipmentStatus: boolean;

  // @ApiProperty({ description: 'Enable maintenance reminders in reports' })
  @IsBoolean()
  maintenanceReminders: boolean;
}

export class IncludeSectionsDto {
  // @ApiProperty({ description: 'Include summary section' })
  @IsBoolean()
  summary: boolean;

  // @ApiProperty({ description: 'Include chemistry section' })
  @IsBoolean()
  chemistry: boolean;

  // @ApiProperty({ description: 'Include equipment section' })
  @IsBoolean()
  equipment: boolean;

  // @ApiProperty({ description: 'Include maintenance section' })
  @IsBoolean()
  maintenance: boolean;

  // @ApiProperty({ description: 'Include weather section' })
  @IsBoolean()
  weather: boolean;
}

export class DateRangeDto {
  // @ApiProperty({ description: 'Start date (ISO 8601 format)' })
  @IsDateString()
  start: string;

  // @ApiProperty({ description: 'End date (ISO 8601 format)' })
  @IsDateString()
  end: string;
}

export class ReportConfigDto {
  // @ApiProperty({ description: 'Days when reports are enabled', type: [String] })
  @IsArray()
  @IsEnum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], { each: true })
  enabledDays: string[];

  // @ApiProperty({ description: 'Default time to send reports (HH:mm format)' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  defaultTime: string;

  // @ApiProperty({ description: 'Enabled report features', type: EnabledFeaturesDto })
  @ValidateNested()
  @Type(() => EnabledFeaturesDto)
  enabledFeatures: EnabledFeaturesDto;

  // @ApiProperty({ description: 'Number of retry attempts', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  retryAttempts: number;

  // @ApiProperty({ description: 'Delay between retries in minutes', minimum: 1, maximum: 60 })
  @IsNumber()
  @Min(1)
  @Max(60)
  retryDelayMinutes: number;
}

export class TestReportDto {
  // @ApiProperty({ description: 'Customer ID to generate test report for' })
  @IsString()
  customerId: string;

  // // @ApiPropertyOptional({ description: 'Template overrides for testing' })
  @IsOptional()
  templateOverrides?: Record<string, any>;
}

export class PreviewReportDto {
  // @ApiProperty({ description: 'Customer ID to generate preview for' })
  @IsString()
  customerId: string;

  // @ApiProperty({ description: 'Report type to preview' })
  @IsEnum(['weekly', 'monthly'])
  reportType: string;

  // // @ApiPropertyOptional({ description: 'Date range for the report', type: DateRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;
}

export class CustomerPreferencesDto {
  // @ApiProperty({ description: 'Whether to receive reports' })
  @IsBoolean()
  receiveReports: boolean;

  // @ApiProperty({ description: 'Report frequency' })
  @IsEnum(['weekly', 'biweekly', 'monthly'])
  reportFrequency: string;

  // @ApiProperty({ description: 'Preferred day for reports' })
  @IsEnum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  preferredDay: string;

  // @ApiProperty({ description: 'Preferred time for reports (HH:mm format)' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  preferredTime: string;

  // @ApiProperty({ description: 'Email format preference' })
  @IsEnum(['html', 'text', 'both'])
  emailFormat: string;

  // @ApiProperty({ description: 'Report sections to include', type: IncludeSectionsDto })
  @ValidateNested()
  @Type(() => IncludeSectionsDto)
  includeSections: IncludeSectionsDto;
}

export class BulkSendDto {
  // // @ApiPropertyOptional({ description: 'Specific customer IDs to send reports to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];

  // // @ApiPropertyOptional({ description: 'Customer tags to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // @ApiProperty({ description: 'Report type to send' })
  @IsEnum(['weekly', 'monthly', 'custom'])
  reportType: string;

  // // @ApiPropertyOptional({ description: 'Dry run mode - validate without sending', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;
}

export class GetReportHistoryDto {
  // // @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  // // @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // // @ApiPropertyOptional({ description: 'Filter by delivery status' })
  @IsOptional()
  @IsEnum(['delivered', 'failed', 'pending'])
  status?: string;

  // // @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  // // @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetReportAnalyticsDto {
  // @ApiProperty({ description: 'Start date for analytics' })
  @IsDateString()
  startDate: string;

  // @ApiProperty({ description: 'End date for analytics' })
  @IsDateString()
  endDate: string;
}

export class NotificationSettingsDto {
  // // @ApiPropertyOptional({ description: 'Notify on successful bulk sends' })
  @IsOptional()
  @IsBoolean()
  notifyOnSuccess?: boolean;

  // // @ApiPropertyOptional({ description: 'Notify on failed reports' })
  @IsOptional()
  @IsBoolean()
  notifyOnFailure?: boolean;

  // // @ApiPropertyOptional({ description: 'Notify on configuration changes' })
  @IsOptional()
  @IsBoolean()
  notifyOnConfigChange?: boolean;

  // // @ApiPropertyOptional({ description: 'Webhook URL for notifications' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

export class EmailTemplateDto {
  // // @ApiPropertyOptional({ description: 'Email subject line' })
  @IsOptional()
  @IsString()
  subject?: string;

  // // @ApiPropertyOptional({ description: 'Header image URL' })
  @IsOptional()
  @IsString()
  headerImage?: string;

  // // @ApiPropertyOptional({ description: 'Footer text' })
  @IsOptional()
  @IsString()
  footerText?: string;

  // // @ApiPropertyOptional({ description: 'Primary color (hex)' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  // // @ApiPropertyOptional({ description: 'Secondary color (hex)' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;
}