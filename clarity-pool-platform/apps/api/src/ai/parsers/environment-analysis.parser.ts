import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseAnalysisParser } from './base-analysis.parser';

export const EnvironmentResponseSchema = z.object({
  vegetation: z
    .object({
      trees_present: z.boolean().optional(),
      tree_count: z.number().optional(),
      tree_types: z.array(z.string()).optional(),
      proximity_to_pool: z.enum(['close', 'moderate', 'far']).optional(),
      overhang_risk: z.enum(['none', 'low', 'medium', 'high']).optional(),
      debris_risk: z.enum(['low', 'medium', 'high']).optional(),
    })
    .optional(),
  ground_conditions: z
    .object({
      surface_type: z
        .enum(['grass', 'dirt', 'both', 'concrete', 'mulch'])
        .optional(),
      drainage: z.enum(['good', 'fair', 'poor']).optional(),
      erosion_risk: z.enum(['none', 'low', 'medium', 'high']).optional(),
      sprinklers_present: z.boolean().optional(),
    })
    .optional(),
  environmental_factors: z
    .object({
      sun_exposure: z
        .enum(['full_sun', 'partial_shade', 'heavy_shade'])
        .optional(),
      wind_exposure: z.enum(['low', 'moderate', 'high']).optional(),
      privacy_level: z.enum(['open', 'partial', 'private']).optional(),
    })
    .optional(),
  maintenance_challenges: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export interface ParsedEnvironmentAnalysis {
  vegetation: {
    treesPresent: boolean;
    treeCount: number;
    treeTypes: string[];
    proximityToPool: string;
    overhangRisk: string;
    debrisRisk: string;
  };
  groundConditions: {
    surfaceType: string;
    drainage: string;
    erosionRisk: string;
    sprinklersPresent: boolean;
  };
  environmentalFactors: {
    sunExposure: string;
    windExposure: string;
    privacyLevel: string;
  };
  maintenanceChallenges: string[];
  recommendations: string[];
  confidence: number;
}

@Injectable()
export class EnvironmentAnalysisParser extends BaseAnalysisParser<
  typeof EnvironmentResponseSchema,
  ParsedEnvironmentAnalysis
> {
  protected readonly logger = new Logger(EnvironmentAnalysisParser.name);
  protected readonly parserName = 'EnvironmentAnalysis';

  protected getSchema() {
    return EnvironmentResponseSchema;
  }

  protected getDefaultResult(): ParsedEnvironmentAnalysis {
    return {
      vegetation: {
        treesPresent: false,
        treeCount: 0,
        treeTypes: [],
        proximityToPool: 'far',
        overhangRisk: 'none',
        debrisRisk: 'low',
      },
      groundConditions: {
        surfaceType: 'grass',
        drainage: 'good',
        erosionRisk: 'none',
        sprinklersPresent: false,
      },
      environmentalFactors: {
        sunExposure: 'full sun',
        windExposure: 'moderate',
        privacyLevel: 'partial',
      },
      maintenanceChallenges: [],
      recommendations: [],
      confidence: 0,
    };
  }

  protected mapToAnalysisStructure(
    data: z.infer<typeof EnvironmentResponseSchema>,
  ): ParsedEnvironmentAnalysis {
    return {
      vegetation: {
        treesPresent: data.vegetation?.trees_present || false,
        treeCount: data.vegetation?.tree_count || 0,
        treeTypes: data.vegetation?.tree_types || [],
        proximityToPool: data.vegetation?.proximity_to_pool || 'far',
        overhangRisk: data.vegetation?.overhang_risk || 'none',
        debrisRisk: data.vegetation?.debris_risk || 'low',
      },
      groundConditions: {
        surfaceType: data.ground_conditions?.surface_type || 'grass',
        drainage: data.ground_conditions?.drainage || 'good',
        erosionRisk: data.ground_conditions?.erosion_risk || 'none',
        sprinklersPresent: data.ground_conditions?.sprinklers_present || false,
      },
      environmentalFactors: {
        sunExposure:
          data.environmental_factors?.sun_exposure?.replace('_', ' ') ||
          'full sun',
        windExposure: data.environmental_factors?.wind_exposure || 'moderate',
        privacyLevel: data.environmental_factors?.privacy_level || 'partial',
      },
      maintenanceChallenges: data.maintenance_challenges || [],
      recommendations: data.recommendations || [],
      confidence: 0.85,
    };
  }
}
