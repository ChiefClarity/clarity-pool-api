import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

// Define the expected structure from AI
export const SurfaceResponseSchema = z.object({
  material: z
    .enum(['plaster', 'pebble', 'tile', 'vinyl', 'fiberglass', 'unknown'])
    .optional(),
  condition: z
    .enum(['excellent', 'good', 'fair', 'poor', 'unknown'])
    .optional(),
  issues: z
    .object({
      stains: z.enum(['none', 'light', 'moderate', 'heavy']).optional(),
      cracks: z.enum(['none', 'minor', 'major']).optional(),
      roughness: z.enum(['smooth', 'slightly rough', 'very rough']).optional(),
      discoloration: z.enum(['none', 'minor', 'significant']).optional(),
      etching: z.enum(['none', 'minor', 'moderate', 'severe']).optional(),
      scaling: z.enum(['none', 'light', 'moderate', 'heavy']).optional(),
      chipping: z.enum(['none', 'minor', 'moderate', 'severe']).optional(),
      hollow_spots: z.enum(['none', 'few', 'many']).optional(),
    })
    .optional(),
  recommendations: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ValidatedSurfaceResponse = z.infer<typeof SurfaceResponseSchema>;

export interface ParsedSurfaceAnalysis {
  material: string;
  condition: string;
  issues: {
    stains: string;
    cracks: string;
    roughness: string;
    discoloration: string;
    etching: string;
    scaling: string;
    chipping: string;
    hollow_spots: string;
  };
  recommendations: string[];
  confidence: number;
}

@Injectable()
export class SurfaceAnalysisParser {
  private readonly logger = new Logger(SurfaceAnalysisParser.name);

  parse(aiResponse: any): ParsedSurfaceAnalysis {
    try {
      // Clean the response
      const cleanedResponse = this.cleanAIResponse(aiResponse);

      // Validate against schema
      const validatedResponse = this.validateResponse(cleanedResponse);

      // Map to standardized structure
      return this.mapToAnalysisStructure(validatedResponse);
    } catch (error) {
      this.logger.error('Failed to parse surface analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  private cleanAIResponse(response: any): any {
    // If response is already an object, return it
    if (typeof response === 'object' && response !== null) {
      return response;
    }

    // If response is a string, try to extract JSON
    if (typeof response === 'string') {
      // First, try to parse as-is
      try {
        return JSON.parse(response);
      } catch (e) {
        // Not valid JSON, continue
      }

      // Remove markdown code blocks if present
      const markdownPattern = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = response.match(markdownPattern);

      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {
          this.logger.warn('Found markdown block but failed to parse JSON:', e);
        }
      }

      // Try to extract JSON object from the string
      const jsonPattern = /\{[\s\S]*\}/;
      const jsonMatch = response.match(jsonPattern);

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          this.logger.warn('Found JSON-like content but failed to parse:', e);
        }
      }
    }

    throw new Error('Unable to extract valid JSON from AI response');
  }

  private validateResponse(response: any): ValidatedSurfaceResponse {
    try {
      // First attempt: direct validation
      return SurfaceResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.warn(
          'Validation failed, attempting to fix common issues:',
          error.errors,
        );

        // Attempt to fix common issues
        const fixed = this.attemptAutoFix(response, error);

        // Try validation again
        try {
          return SurfaceResponseSchema.parse(fixed);
        } catch (secondError) {
          this.logger.error('Auto-fix failed:', secondError);
          throw secondError;
        }
      }
      throw error;
    }
  }

  private attemptAutoFix(response: any, zodError: z.ZodError): any {
    const fixed = { ...response };

    // Ensure issues object exists
    if (!fixed.issues) {
      fixed.issues = {};
    }

    // Fix missing issue fields with defaults
    const defaultIssues = {
      stains: 'none',
      cracks: 'none',
      roughness: 'smooth',
      discoloration: 'none',
      etching: 'none',
      scaling: 'none',
      chipping: 'none',
      hollow_spots: 'none',
    };

    for (const [key, defaultValue] of Object.entries(defaultIssues)) {
      if (!fixed.issues[key]) {
        fixed.issues[key] = defaultValue;
      }
    }

    // Ensure recommendations is an array
    if (!Array.isArray(fixed.recommendations)) {
      fixed.recommendations = fixed.recommendations
        ? [fixed.recommendations]
        : [];
    }

    // Normalize material and condition
    if (fixed.material) {
      fixed.material = this.normalizeMaterial(fixed.material);
    }

    if (fixed.condition) {
      fixed.condition = this.normalizeCondition(fixed.condition);
    }

    return fixed;
  }

  private normalizeMaterial(material: string): string {
    const normalized = material.toLowerCase().trim();

    // Handle variations
    const materialMap: Record<string, string> = {
      plaster: 'plaster',
      'diamond brite': 'plaster',
      marcite: 'plaster',
      pebble: 'pebble',
      pebbletec: 'pebble',
      pebblecrete: 'pebble',
      tile: 'tile',
      ceramic: 'tile',
      glass: 'tile',
      vinyl: 'vinyl',
      liner: 'vinyl',
      fiberglass: 'fiberglass',
      fibreglass: 'fiberglass',
    };

    for (const [key, value] of Object.entries(materialMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return 'unknown';
  }

  private normalizeCondition(condition: string): string {
    const normalized = condition.toLowerCase().trim();

    const conditionMap: Record<string, string> = {
      excellent: 'excellent',
      'like new': 'excellent',
      good: 'good',
      fair: 'fair',
      average: 'fair',
      poor: 'poor',
      bad: 'poor',
      'needs resurfacing': 'poor',
    };

    return conditionMap[normalized] || 'unknown';
  }

  private mapToAnalysisStructure(
    data: ValidatedSurfaceResponse,
  ): ParsedSurfaceAnalysis {
    return {
      material: data.material || 'unknown',
      condition: data.condition || 'unknown',
      issues: {
        stains: data.issues?.stains || 'none',
        cracks: data.issues?.cracks || 'none',
        roughness: data.issues?.roughness || 'smooth',
        discoloration: data.issues?.discoloration || 'none',
        etching: data.issues?.etching || 'none',
        scaling: data.issues?.scaling || 'none',
        chipping: data.issues?.chipping || 'none',
        hollow_spots: data.issues?.hollow_spots || 'none',
      },
      recommendations: data.recommendations || [],
      confidence: data.confidence || 0.85,
    };
  }

  private getDefaultAnalysis(): ParsedSurfaceAnalysis {
    return {
      material: 'unknown',
      condition: 'unknown',
      issues: {
        stains: 'none',
        cracks: 'none',
        roughness: 'smooth',
        discoloration: 'none',
        etching: 'none',
        scaling: 'none',
        chipping: 'none',
        hollow_spots: 'none',
      },
      recommendations: [],
      confidence: 0,
    };
  }
}
