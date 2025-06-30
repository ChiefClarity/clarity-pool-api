import { Injectable, Logger } from '@nestjs/common';
import { SatelliteAnalysisResponse, ParsedSatelliteAnalysis } from '../types/ai-responses';

@Injectable()
export class SatelliteAnalysisParser {
  private readonly logger = new Logger(SatelliteAnalysisParser.name);

  parse(aiResponse: any): ParsedSatelliteAnalysis {
    try {
      const data = this.extractJsonFromResponse(aiResponse);
      return this.mapToAnalysisStructure(data);
    } catch (error) {
      this.logger.error('Failed to parse satellite analysis:', error);
      throw new Error(`Invalid satellite analysis response: ${error.message}`);
    }
  }

  private extractJsonFromResponse(response: any): SatelliteAnalysisResponse {
    let jsonStr = typeof response === 'string' ? response : JSON.stringify(response);
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      // Try to extract JSON from partial response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    }
  }

  private mapToAnalysisStructure(data: SatelliteAnalysisResponse): ParsedSatelliteAnalysis {
    // Handle variations in property names
    const poolDetected = data.pool_presence ?? data.pool_present ?? false;
    const dimensions = data.approximate_dimensions ?? data.pool_dimensions;
    const shape = data.pool_shape ?? data.poolShape ?? 'rectangle';
    
    // Parse dimensions with error handling
    const poolDimensions = this.parseDimensions(dimensions);
    
    // Extract features safely
    const features = this.extractFeatures(data);
    
    // Parse property features
    const propertyFeatures = this.parsePropertyFeatures(data.surrounding_landscape);
    
    return {
      poolDetected,
      poolDimensions,
      poolShape: this.normalizePoolShape(shape),
      poolFeatures: features,
      propertyFeatures,
      confidence: poolDetected ? 0.85 : 0.0
    };
  }

  private parseDimensions(dims: any): ParsedSatelliteAnalysis['poolDimensions'] {
    if (!dims) return undefined;
    
    const length = this.parseDistance(dims.length);
    const width = this.parseDistance(dims.width);
    
    if (!length || !width) return undefined;
    
    return {
      length,
      width,
      surfaceArea: length * width
    };
  }

  private parseDistance(value: any): number {
    if (!value) return 0;
    
    // Handle different formats: "15m", "15 meters", "15 ft", "15"
    const numMatch = String(value).match(/(\d+(?:\.\d+)?)/);
    if (!numMatch) return 0;
    
    const num = parseFloat(numMatch[1]);
    
    // Convert meters to feet if needed
    if (String(value).toLowerCase().includes('m')) {
      return Math.round(num * 3.28084);
    }
    
    return Math.round(num);
  }

  private normalizePoolShape(shape: string): ParsedSatelliteAnalysis['poolShape'] {
    const normalizedShape = shape.toLowerCase().trim();
    const validShapes = ['rectangle', 'oval', 'kidney', 'freeform', 'round'];
    
    return validShapes.includes(normalizedShape) 
      ? normalizedShape as ParsedSatelliteAnalysis['poolShape']
      : 'rectangle';
  }

  private extractFeatures(data: SatelliteAnalysisResponse): ParsedSatelliteAnalysis['poolFeatures'] {
    const allFeatures = [
      ...(data.features || []),
      ...(data.spa_waterfeature || [])
    ].map(f => f.toLowerCase());
    
    const deckInfo = data.deck_material_condition?.toLowerCase() || '';
    
    return {
      hasSpillover: allFeatures.some(f => f.includes('spillover')),
      hasSpa: allFeatures.some(f => f.includes('spa')),
      hasWaterFeature: allFeatures.some(f => 
        f.includes('waterfall') || f.includes('fountain') || f.includes('water feature')
      ),
      hasDeck: !!deckInfo || allFeatures.some(f => f.includes('deck')),
      deckMaterial: this.extractDeckMaterial(deckInfo)
    };
  }

  private extractDeckMaterial(deckInfo: string): string {
    const materials = ['concrete', 'pavers', 'wood', 'composite', 'stone', 'tile'];
    
    for (const material of materials) {
      if (deckInfo.includes(material)) {
        return material;
      }
    }
    
    return 'concrete'; // default
  }

  private parsePropertyFeatures(landscape?: string): ParsedSatelliteAnalysis['propertyFeatures'] {
    const desc = landscape?.toLowerCase() || '';
    
    // Extract tree count
    const treeMatch = desc.match(/(\d+)\s*tree/);
    const treeCount = treeMatch ? parseInt(treeMatch[1]) : 0;
    
    // Determine proximity
    let proximity: 'close' | 'moderate' | 'far' = 'far';
    if (desc.includes('near') || desc.includes('close')) {
      proximity = 'close';
    } else if (desc.includes('moderate') || desc.includes('some')) {
      proximity = 'moderate';
    }
    
    return {
      treeCount,
      treeProximity: proximity,
      landscapeType: this.detectLandscapeType(desc),
      propertySize: 'medium' // Could be enhanced with more logic
    };
  }

  private detectLandscapeType(desc: string): string {
    if (desc.includes('tropical') || desc.includes('palm')) return 'tropical';
    if (desc.includes('desert') || desc.includes('xeriscape')) return 'desert';
    if (desc.includes('mediterranean')) return 'mediterranean';
    return 'temperate';
  }
}