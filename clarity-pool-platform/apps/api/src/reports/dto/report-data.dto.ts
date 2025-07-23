import {
  IsNumber,
  IsString,
  IsDate,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChemistryReadingsDto {
  @IsNumber()
  chlorine: number;

  @IsNumber()
  ph: number;

  @IsNumber()
  alkalinity: number;

  @IsNumber()
  calcium: number;

  @IsNumber()
  cyanuricAcid: number;

  @IsOptional()
  @IsNumber()
  salt?: number;

  @IsOptional()
  @IsNumber()
  tds?: number;

  @IsOptional()
  @IsNumber()
  phosphates?: number;

  @IsOptional()
  @IsNumber()
  copper?: number;

  @IsOptional()
  @IsNumber()
  iron?: number;
}

export class ChemicalAddedDto {
  @IsString()
  chemical: string;

  @IsString()
  amount: string;

  @IsString()
  reason: string;
}

export class PoolbrainJobCompletedDto {
  @IsNumber()
  jobId: number;

  @IsNumber()
  customerId: number;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsDate()
  @Type(() => Date)
  completedAt: Date;

  @IsString()
  technicianId: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;
}

export class GenerateReportDto {
  @IsNumber()
  jobId: number;

  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  @IsBoolean()
  @IsOptional()
  immediate?: boolean;
}
