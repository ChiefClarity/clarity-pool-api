import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseAnalysisParser } from './base-analysis.parser';

export const DeckResponseSchema = z.object({
  material: z
    .enum([
      'pavers',
      'stamped_concrete',
      'concrete',
      'natural_stone',
      'tile',
      'wood',
      'composite',
      'other',
    ])
    .optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  cleanliness: z.enum(['pristine', 'clean', 'dirty', 'filthy']).optional(),
  issues: z
    .object({
      cracks: z.boolean().optional(),
      stains: z.boolean().optional(),
      algae_growth: z.boolean().optional(),
      uneven_surfaces: z.boolean().optional(),
      drainage_issues: z.boolean().optional(),
    })
    .optional(),
  safety_concerns: z.array(z.string()).optional(),
  maintenance_needed: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export interface ParsedDeckAnalysis {
  material: string;
  condition: string;
  cleanliness: string;
  issues: {
    cracks: boolean;
    stains: boolean;
    algaeGrowth: boolean;
    unevenSurfaces: boolean;
    drainageIssues: boolean;
  };
  safetyConcerns: string[];
  maintenanceNeeded: string[];
  recommendations: string[];
  confidence: number;
}

@Injectable()
export class DeckAnalysisParser extends BaseAnalysisParser<
  typeof DeckResponseSchema,
  ParsedDeckAnalysis
> {
  protected readonly logger = new Logger(DeckAnalysisParser.name);
  protected readonly parserName = 'DeckAnalysis';

  protected getSchema() {
    return DeckResponseSchema;
  }

  protected getDefaultResult(): ParsedDeckAnalysis {
    return {
      material: 'unknown',
      condition: 'unknown',
      cleanliness: 'unknown',
      issues: {
        cracks: false,
        stains: false,
        algaeGrowth: false,
        unevenSurfaces: false,
        drainageIssues: false,
      },
      safetyConcerns: [],
      maintenanceNeeded: [],
      recommendations: [],
      confidence: 0,
    };
  }

  protected mapToAnalysisStructure(
    data: z.infer<typeof DeckResponseSchema>,
  ): ParsedDeckAnalysis {
    return {
      material: data.material?.replace('_', ' ') || 'unknown',
      condition: data.condition || 'unknown',
      cleanliness: data.cleanliness || 'unknown',
      issues: {
        cracks: data.issues?.cracks || false,
        stains: data.issues?.stains || false,
        algaeGrowth: data.issues?.algae_growth || false,
        unevenSurfaces: data.issues?.uneven_surfaces || false,
        drainageIssues: data.issues?.drainage_issues || false,
      },
      safetyConcerns: data.safety_concerns || [],
      maintenanceNeeded: data.maintenance_needed || [],
      recommendations: data.recommendations || [],
      confidence: 0.85,
    };
  }
}
