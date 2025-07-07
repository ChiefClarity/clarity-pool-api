import { Injectable } from '@nestjs/common';
import { BaseAIParser } from './base.parser';
import * as z from 'zod';

const WeatherPollenResponseSchema = z
  .object({
    location: z
      .object({
        city: z.string().optional(),
        state: z.string().optional(),
        coordinates: z
          .object({
            lat: z.number().optional(),
            lng: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
    weather: z
      .object({
        annual_rainfall: z.union([z.number(), z.string()]).optional(),
        avg_annual_rainfall: z.union([z.number(), z.string()]).optional(),
        rainfall_inches: z.union([z.number(), z.string()]).optional(),
        wind_patterns: z.string().optional(),
        prevailing_winds: z.string().optional(),
      })
      .optional(),
    seasonal: z
      .object({
        summer: z
          .object({
            avg_temp: z.union([z.number(), z.string()]).optional(),
            temperature: z.union([z.number(), z.string()]).optional(),
            humidity: z.union([z.number(), z.string()]).optional(),
          })
          .optional(),
        winter: z
          .object({
            avg_temp: z.union([z.number(), z.string()]).optional(),
            temperature: z.union([z.number(), z.string()]).optional(),
            humidity: z.union([z.number(), z.string()]).optional(),
          })
          .optional(),
        spring: z
          .object({
            avg_temp: z.union([z.number(), z.string()]).optional(),
            temperature: z.union([z.number(), z.string()]).optional(),
            humidity: z.union([z.number(), z.string()]).optional(),
          })
          .optional(),
        fall: z
          .object({
            avg_temp: z.union([z.number(), z.string()]).optional(),
            temperature: z.union([z.number(), z.string()]).optional(),
            humidity: z.union([z.number(), z.string()]).optional(),
          })
          .optional(),
      })
      .optional(),
    pollen: z
      .object({
        current_level: z.string().optional(),
        level: z.string().optional(),
        main_types: z.array(z.string()).optional(),
        types: z.array(z.string()).optional(),
        forecast: z.string().optional(),
        season_forecast: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export interface ParsedWeatherPollenData {
  avgRainfall: number;
  windPatterns: string;
  seasonalFactors: {
    summer: { avgTemp: number; humidity: number };
    winter: { avgTemp: number; humidity: number };
    spring: { avgTemp: number; humidity: number };
    fall: { avgTemp: number; humidity: number };
  };
  pollenData?: {
    currentLevel: string;
    mainTypes: string[];
    forecast: string;
  };
  confidence: number;
}

@Injectable()
export class WeatherPollenParser extends BaseAIParser<ParsedWeatherPollenData> {
  protected validateResponse(
    data: any,
  ): z.infer<typeof WeatherPollenResponseSchema> {
    return WeatherPollenResponseSchema.parse(data);
  }

  protected handleValidationError(
    error: z.ZodError,
    rawData: any,
  ): z.infer<typeof WeatherPollenResponseSchema> {
    this.logger.warn('Weather/pollen validation failed, using defaults', {
      errors: error.errors,
    });

    return {
      location: {},
      weather: {
        annual_rainfall: 52.4,
        wind_patterns: 'Moderate easterly winds',
      },
      seasonal: {
        summer: { avg_temp: 85, humidity: 75 },
        winter: { avg_temp: 65, humidity: 60 },
        spring: { avg_temp: 78, humidity: 70 },
        fall: { avg_temp: 75, humidity: 68 },
      },
      pollen: {
        current_level: 'moderate',
        main_types: ['Oak', 'Pine', 'Grass'],
        forecast: 'Seasonal variations expected',
      },
    };
  }

  protected mapToAnalysisStructure(
    data: z.infer<typeof WeatherPollenResponseSchema>,
  ): ParsedWeatherPollenData {
    const weather = data.weather || {};
    const seasonal = data.seasonal || {};
    const pollen = data.pollen || {};

    return {
      avgRainfall: this.parseNumber(
        weather.annual_rainfall ||
          weather.avg_annual_rainfall ||
          weather.rainfall_inches ||
          52.4,
      ),
      windPatterns:
        weather.wind_patterns ||
        weather.prevailing_winds ||
        'Variable winds throughout the year',
      seasonalFactors: {
        summer: {
          avgTemp: this.parseNumber(
            seasonal.summer?.avg_temp || seasonal.summer?.temperature || 85,
          ),
          humidity: this.parseNumber(seasonal.summer?.humidity || 75),
        },
        winter: {
          avgTemp: this.parseNumber(
            seasonal.winter?.avg_temp || seasonal.winter?.temperature || 65,
          ),
          humidity: this.parseNumber(seasonal.winter?.humidity || 60),
        },
        spring: {
          avgTemp: this.parseNumber(
            seasonal.spring?.avg_temp || seasonal.spring?.temperature || 78,
          ),
          humidity: this.parseNumber(seasonal.spring?.humidity || 70),
        },
        fall: {
          avgTemp: this.parseNumber(
            seasonal.fall?.avg_temp || seasonal.fall?.temperature || 75,
          ),
          humidity: this.parseNumber(seasonal.fall?.humidity || 68),
        },
      },
      pollenData: {
        currentLevel: this.normalizePollenLevel(
          pollen.current_level || pollen.level || 'moderate',
        ),
        mainTypes: pollen.main_types ||
          pollen.types || ['Oak', 'Pine', 'Grass'],
        forecast:
          pollen.forecast ||
          pollen.season_forecast ||
          'Typical seasonal patterns expected',
      },
      confidence: 0.85,
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

  private normalizePollenLevel(level: string): string {
    const normalized = level.toLowerCase().trim();
    const validLevels = ['low', 'moderate', 'high', 'very high'];

    if (validLevels.includes(normalized)) {
      return normalized;
    }

    // Map common variations
    if (normalized.includes('low')) return 'low';
    if (normalized.includes('high')) return 'high';
    if (normalized.includes('medium') || normalized.includes('moderate'))
      return 'moderate';

    return 'moderate';
  }
}

