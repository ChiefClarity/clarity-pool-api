import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseAnalysisParser } from './base-analysis.parser';

export const SkimmerResponseSchema = z.object({
  detectedSkimmerCount: z.number().optional(),
  skimmers: z.array(z.object({
    basketCondition: z.enum(['clean', 'dirty', 'damaged', 'missing']).optional(),
    lidCondition: z.enum(['intact', 'cracked', 'missing']).optional(),
    weirDoorCondition: z.enum(['good', 'stuck', 'missing']).optional(),
    housingCondition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
    visibleDamage: z.boolean().optional(),
    debrisLevel: z.enum(['none', 'light', 'moderate', 'heavy']).optional(),
  })).optional(),
  overallCondition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  maintenanceNeeded: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export interface ParsedSkimmerAnalysis {
  detectedSkimmerCount: number;
  skimmers: Array<{
    basketCondition: string;
    lidCondition: string;
    weirDoorCondition: string;
    housingCondition: string;
    visibleDamage: boolean;
    debrisLevel: string;
  }>;
  overallCondition: string;
  maintenanceNeeded: string[];
  recommendations: string[];
  confidence: number;
}

@Injectable()
export class SkimmerAnalysisParser extends BaseAnalysisParser<typeof SkimmerResponseSchema, ParsedSkimmerAnalysis> {
  protected readonly logger = new Logger(SkimmerAnalysisParser.name);
  protected readonly parserName = 'SkimmerAnalysis';

  protected getSchema() {
    return SkimmerResponseSchema;
  }

  protected getDefaultResult(): ParsedSkimmerAnalysis {
    return {
      detectedSkimmerCount: 0,
      skimmers: [],
      overallCondition: 'unknown',
      maintenanceNeeded: [],
      recommendations: [],
      confidence: 0,
    };
  }

  protected mapToAnalysisStructure(data: z.infer<typeof SkimmerResponseSchema>): ParsedSkimmerAnalysis {
    return {
      detectedSkimmerCount: data.detectedSkimmerCount || 0,
      skimmers: (data.skimmers || []).map(skimmer => ({
        basketCondition: skimmer.basketCondition || 'unknown',
        lidCondition: skimmer.lidCondition || 'unknown',
        weirDoorCondition: skimmer.weirDoorCondition || 'unknown',
        housingCondition: skimmer.housingCondition || 'unknown',
        visibleDamage: skimmer.visibleDamage || false,
        debrisLevel: skimmer.debrisLevel || 'none',
      })),
      overallCondition: data.overallCondition || 'unknown',
      maintenanceNeeded: data.maintenanceNeeded || [],
      recommendations: data.recommendations || [],
      confidence: 0.85,
    };
  }
}