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
  structures: z
    .object({
      screen_enclosure: z.boolean().optional(),
      enclosure_condition: z.enum(['excellent', 'good', 'fair', 'poor', 'none']).optional(),
      pool_orientation: z.enum(['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'unknown']).optional(),
      shade_structures: z.array(z.string()).optional(),
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
  structures: {
    screenEnclosure: boolean;
    fencing: boolean;
    pergola: boolean;
    enclosureCondition: string;
    poolOrientation: string;
    shadeStructures: string[];
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
      structures: {
        screenEnclosure: false,
        fencing: false,
        pergola: false,
        enclosureCondition: 'none',
        poolOrientation: 'unknown',
        shadeStructures: [],
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
        treeTypes: this.enhanceTreeTypes(data.vegetation?.tree_types || []),
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
      structures: {
        screenEnclosure: data.structures?.screen_enclosure || false,
        fencing: this.detectFencing(data),
        pergola: this.detectPergola(data.structures?.shade_structures),
        enclosureCondition: data.structures?.enclosure_condition || 'none',
        poolOrientation: data.structures?.pool_orientation || 'unknown',
        shadeStructures: data.structures?.shade_structures || [],
      },
      maintenanceChallenges: data.maintenance_challenges || [],
      recommendations: data.recommendations || [],
      confidence: 0.85,
    };
  }

  private detectFencing(data: any): boolean {
    // Check if fencing was mentioned in maintenance challenges or recommendations
    const allText = [
      ...(data.maintenance_challenges || []),
      ...(data.recommendations || []),
    ].join(' ').toLowerCase();
    
    return allText.includes('fence') || allText.includes('fencing');
  }

  private detectPergola(shadeStructures: string[] = []): boolean {
    return shadeStructures.some(structure => 
      structure.toLowerCase().includes('pergola')
    );
  }

  private enhanceTreeTypes(types: string[]): string[] {
    // Filter out generic "unknown" if we have specific types
    const specificTypes = types.filter(type => 
      type.toLowerCase() !== 'unknown' && 
      type.toLowerCase() !== 'tree'
    );
    
    // If we have specific types, use them
    if (specificTypes.length > 0) {
      return specificTypes;
    }
    
    // If all unknown, provide a more helpful response
    if (types.length > 0 && types.every(type => 
      type.toLowerCase() === 'unknown' || type.toLowerCase() === 'tree'
    )) {
      return ['Trees detected - species identification pending'];
    }
    
    return types;
  }
}
