import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { 
  SatelliteResponseSchema, 
  ValidatedSatelliteResponse 
} from '../schemas/satellite-response.schema';
import { 
  ParsedSatelliteAnalysis 
} from '../types/ai-responses';

@Injectable()
export class SatelliteAnalysisParser {
  private readonly logger = new Logger(SatelliteAnalysisParser.name);

  parse(aiResponse: any): ParsedSatelliteAnalysis {
    try {
      // Step 1: Extract and clean the response
      const cleanedResponse = this.cleanResponse(aiResponse);
      
      // Step 2: Validate against schema
      const validatedData = this.validateResponse(cleanedResponse);
      
      // Step 3: Map to our internal structure
      return this.mapToAnalysisStructure(validatedData);
    } catch (error) {
      this.logger.error('Failed to parse satellite analysis:', error);
      
      // Return a safe default instead of throwing
      return {
        poolDetected: false,
        poolShape: 'rectangle',
        confidence: 0,
        poolFeatures: {
          hasSpillover: false,
          hasSpa: false,
          hasWaterFeature: false,
          hasDeck: false,
          deckMaterial: 'unknown'
        },
        propertyFeatures: {
          treeCount: 0,
          treeProximity: 'far',
          landscapeType: 'unknown',
          propertySize: 'unknown'
        }
      };
    }
  }

  private cleanResponse(response: any): any {
    let responseStr = typeof response === 'string' ? response : JSON.stringify(response);
    
    // Remove markdown code blocks
    responseStr = responseStr.replace(/```json\s*/gi, '');
    responseStr = responseStr.replace(/```\s*/g, '');
    
    // Extract JSON object (find first { and last })
    const jsonStart = responseStr.indexOf('{');
    const jsonEnd = responseStr.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }
    
    const jsonStr = responseStr.substring(jsonStart, jsonEnd + 1);
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error('Failed to parse JSON:', jsonStr);
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  private validateResponse(data: any): ValidatedSatelliteResponse {
    try {
      // This will throw if validation fails
      return SatelliteResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error('Schema validation failed:', error.errors);
        
        // Try to fix common issues
        const fixed = this.attemptAutoFix(data, error);
        if (fixed) {
          return SatelliteResponseSchema.parse(fixed);
        }
      }
      throw error;
    }
  }

  private attemptAutoFix(data: any, zodError: z.ZodError): any {
    const fixed = { ...data };
    
    for (const error of zodError.errors) {
      const path = error.path.join('.');
      
      // Fix missing required fields with sensible defaults
      if (error.code === 'invalid_type' && error.received === 'undefined') {
        switch (path) {
          case 'pool_presence':
            fixed.pool_presence = fixed.pool_present ?? false;
            break;
          case 'surrounding_landscape':
            fixed.surrounding_landscape = 'No landscape description available';
            break;
          case 'pool_shape':
            fixed.pool_shape = fixed.poolShape || 'unknown';
            break;
        }
      }
    }
    
    return fixed;
  }

  private mapToAnalysisStructure(data: ValidatedSatelliteResponse): ParsedSatelliteAnalysis {
    const poolDetected = data.pool_presence || data.pool_present || false;
    const dimensions = data.pool_dimensions || data.approximate_dimensions;
    
    return {
      poolDetected,
      poolDimensions: dimensions ? {
        length: this.parseNumber(dimensions.length),
        width: this.parseNumber(dimensions.width),
        surfaceArea: this.parseNumber(dimensions.length) * this.parseNumber(dimensions.width)
      } : undefined,
      poolShape: this.normalizePoolShape(data.pool_shape || data.poolShape),
      poolFeatures: {
        hasSpillover: data.features?.includes('spillover') || false,
        hasSpa: data.features?.includes('spa') || 
                data.spa_waterfeature?.includes('spa') || false,
        hasWaterFeature: data.features?.some(f => 
          ['waterfall', 'fountain', 'water feature'].includes(f)
        ) || false,
        hasDeck: data.deck_present ?? true,
        deckMaterial: this.extractDeckMaterial(data.deck_material_condition)
      },
      propertyFeatures: {
        treeCount: data.tree_count || this.extractTreeCount(data.surrounding_landscape),
        treeProximity: data.trees_near_pool ? 'close' : 'far',
        landscapeType: data.landscape_type || 'unknown',
        propertySize: data.property_size || 'medium'
      },
      confidence: data.confidence || (poolDetected ? 0.85 : 0.0)
    };
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  private normalizePoolShape(shape: any): ParsedSatelliteAnalysis['poolShape'] {
    if (!shape || typeof shape !== 'string') return 'rectangle';
    
    const normalized = shape.toLowerCase().trim();
    const validShapes = ['rectangle', 'oval', 'kidney', 'freeform', 'round'];
    
    return validShapes.includes(normalized) 
      ? normalized as ParsedSatelliteAnalysis['poolShape']
      : 'rectangle';
  }

  private extractDeckMaterial(deckInfo: any): string {
    if (!deckInfo || typeof deckInfo !== 'string') return 'concrete';
    
    const materials = ['concrete', 'pavers', 'wood', 'composite', 'stone', 'tile'];
    const lowerInfo = deckInfo.toLowerCase();
    
    for (const material of materials) {
      if (lowerInfo.includes(material)) {
        return material;
      }
    }
    
    return 'concrete';
  }

  private extractTreeCount(landscape: string): number {
    if (!landscape) return 0;
    
    const match = landscape.match(/(\d+)\s*tree/i);
    return match ? parseInt(match[1]) : 0;
  }
}