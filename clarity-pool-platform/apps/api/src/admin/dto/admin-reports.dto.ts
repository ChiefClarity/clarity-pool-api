// apps/api/src/admin/dto/admin-reports.dto.ts
// ENTERPRISE GRADE FIX - Without Swagger decorators
import { 
  IsBoolean, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsDate, 
  IsArray,
  IsEmail,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Sub-DTOs for nested objects
export class EnabledFeaturesDto {
  @IsBoolean()
  charts: boolean;

  @IsBoolean()
  weather: boolean;

  @IsBoolean()
  insights: boolean;
}

export class EmailTemplateDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  template?: string;
}

// Main DTOs
export class UpdateReportConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1440)
  defaultDelay?: number;

  @IsBoolean()
  @IsOptional()
  includeCharts?: boolean;

  @IsString()
  @IsOptional()
  aiProvider?: string;

  @IsBoolean()
  @IsOptional()
  weatherEnabled?: boolean;

  @IsString()
  @IsOptional()
  scheduleCron?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledDays?: string[];

  @IsString()
  @IsOptional()
  defaultTime?: string;

  @Type(() => EnabledFeaturesDto)
  @ValidateNested()
  @IsOptional()
  enabledFeatures?: EnabledFeaturesDto;

  @IsNumber()
  @IsOptional()
  retryAttempts?: number;

  @IsNumber()
  @IsOptional()
  retryDelayMinutes?: number;

  @IsString()
  @IsOptional()
  defaultFormat?: string;
}

export class ReportHistoryFiltersDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class UpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1440)
  reportDelay?: number;

  @IsBoolean()
  @IsOptional()
  includeCharts?: boolean;

  @IsString()
  @IsOptional()
  preferredFormat?: string;
}

export class TestReportDto {
  @IsEmail()
  recipientEmail: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  customerId?: number;
}

export class PreviewReportDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @Type(() => EmailTemplateDto)
  @ValidateNested()
  @IsOptional()
  emailTemplate?: EmailTemplateDto;
}

export class CustomerPreferencesDto {
  @IsBoolean()
  receiveReports: boolean;

  @IsBoolean()
  @IsOptional()
  receiveWeeklyReports?: boolean;

  @IsString()
  @IsOptional()
  preferredTime?: string;

  @IsString()
  @IsOptional()
  preferredDay?: string;

  @IsBoolean()
  @IsOptional()
  includeWeatherData?: boolean;

  @IsBoolean()
  @IsOptional()
  includeServiceHistory?: boolean;

  @IsBoolean()
  @IsOptional()
  includeUpcomingServices?: boolean;
}

export class BulkSendDto {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  recipientIds?: string[];

  @IsBoolean()
  @IsOptional()
  sendToAll?: boolean;

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  customerIds?: number[];
}

export class BulkSendReportsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  customerIds: number[];
}