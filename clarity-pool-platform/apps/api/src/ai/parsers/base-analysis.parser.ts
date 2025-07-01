import { Logger } from '@nestjs/common';
import { z } from 'zod';

export abstract class BaseAnalysisParser<TSchema extends z.ZodSchema, TResult> {
  protected abstract readonly logger: Logger;
  protected abstract readonly parserName: string;

  protected abstract getSchema(): TSchema;
  protected abstract getDefaultResult(): TResult;
  protected abstract mapToAnalysisStructure(data: z.infer<TSchema>): TResult;

  parse(aiResponse: any): TResult {
    try {
      // Clean the response
      const cleanedResponse = this.cleanAIResponse(aiResponse);
      
      // Validate against schema
      const validatedResponse = this.validateResponse(cleanedResponse);
      
      // Map to standardized structure
      return this.mapToAnalysisStructure(validatedResponse);
    } catch (error) {
      this.logger.error(`Failed to parse ${this.parserName}:`, error);
      return this.getDefaultResult();
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

  private validateResponse(response: any): z.infer<TSchema> {
    try {
      const schema = this.getSchema();
      return schema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.warn('Validation failed:', error.errors);
        throw error;
      }
      throw error;
    }
  }
}