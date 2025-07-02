import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseAnalysisParser } from './base-analysis.parser';

export const EquipmentResponseSchema = z.object({
  equipment_type: z
    .enum([
      'pump',
      'filter',
      'heater',
      'chlorinator',
      'automation',
      'valve',
      'timer',
      'other',
    ])
    .optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().nullable().optional(),
  age: z.string().nullable().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  equipment_subtype: z.string().nullable().optional(),
  replacement_cartridge: z.string().nullable().optional(),
  issues: z
    .object({
      rust: z.boolean().optional(),
      leaks: z.boolean().optional(),
      cracks: z.boolean().optional(),
      electrical_issues: z.boolean().optional(),
      missing_parts: z.boolean().optional(),
      noise: z.boolean().optional(),
    })
    .optional(),
  specifications: z
    .object({
      horsepower: z.string().nullable().optional(),
      voltage: z.string().nullable().optional(),
      filter_size: z.string().nullable().optional(),
      flow_rate: z.string().nullable().optional(),
      capacity: z.string().nullable().optional(),
    })
    .optional(),
  maintenance_needed: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),

  // Multiple equipment detected
  detected_equipment: z
    .array(
      z.object({
        type: z.string(),
        brand: z.string().optional(),
        model: z.string().optional(),
        condition: z.string().optional(),
      }),
    )
    .optional(),

  // Specific readings
  pressure_reading: z.number().nullable().optional(),
  timer_settings: z
    .object({
      on_time: z.string().nullable().optional(),
      off_time: z.string().nullable().optional(),
      duration: z.string().nullable().optional(),
    })
    .optional(),
});

export interface ParsedEquipmentAnalysis {
  equipmentType: string;
  equipmentSubtype: string;
  brand: string;
  model: string;
  serialNumber: string;
  age: string;
  condition: string;
  replacementCartridge: string;
  issues: {
    rust: boolean;
    leaks: boolean;
    cracks: boolean;
    electricalIssues: boolean;
    missingParts: boolean;
    noise: boolean;
  };
  specifications: {
    horsepower: string;
    voltage: string;
    filterSize: string;
    flowRate: string;
    capacity: string;
  };
  maintenanceNeeded: string[];
  recommendations: string[];
  detectedEquipment: Array<{
    type: string;
    brand?: string;
    model?: string;
    condition?: string;
  }>;
  pressureReading: number | null;
  timerSettings: {
    onTime: string;
    offTime: string;
    duration: string;
  };
  confidence: number;
}

@Injectable()
export class EquipmentAnalysisParser extends BaseAnalysisParser<
  typeof EquipmentResponseSchema,
  ParsedEquipmentAnalysis
> {
  protected readonly logger = new Logger(EquipmentAnalysisParser.name);
  protected readonly parserName = 'EquipmentAnalysis';

  protected getSchema() {
    return EquipmentResponseSchema;
  }

  protected getDefaultResult(): ParsedEquipmentAnalysis {
    return {
      equipmentType: 'unknown',
      equipmentSubtype: 'unknown',
      brand: 'unknown',
      model: 'unknown',
      serialNumber: '',
      age: 'unknown',
      condition: 'unknown',
      replacementCartridge: '',
      issues: {
        rust: false,
        leaks: false,
        cracks: false,
        electricalIssues: false,
        missingParts: false,
        noise: false,
      },
      specifications: {
        horsepower: '',
        voltage: '',
        filterSize: '',
        flowRate: '',
        capacity: '',
      },
      maintenanceNeeded: [],
      recommendations: [],
      detectedEquipment: [],
      pressureReading: null,
      timerSettings: {
        onTime: '',
        offTime: '',
        duration: '',
      },
      confidence: 0,
    };
  }

  protected mapToAnalysisStructure(
    data: z.infer<typeof EquipmentResponseSchema>,
  ): ParsedEquipmentAnalysis {
    return {
      equipmentType: data.equipment_type || 'unknown',
      equipmentSubtype: data.equipment_subtype || 'unknown',
      brand: data.brand || 'unknown',
      model: data.model || 'unknown',
      serialNumber: data.serial_number || '',
      age: data.age || 'unknown',
      condition: data.condition || 'unknown',
      replacementCartridge: data.replacement_cartridge || '',
      issues: {
        rust: data.issues?.rust || false,
        leaks: data.issues?.leaks || false,
        cracks: data.issues?.cracks || false,
        electricalIssues: data.issues?.electrical_issues || false,
        missingParts: data.issues?.missing_parts || false,
        noise: data.issues?.noise || false,
      },
      specifications: {
        horsepower: data.specifications?.horsepower || '',
        voltage: data.specifications?.voltage || '',
        filterSize: data.specifications?.filter_size || '',
        flowRate: data.specifications?.flow_rate || '',
        capacity: data.specifications?.capacity || '',
      },
      maintenanceNeeded: data.maintenance_needed || [],
      recommendations: data.recommendations || [],
      detectedEquipment: (data.detected_equipment || []).map((eq) => ({
        type: eq.type,
        brand: eq.brand,
        model: eq.model,
        condition: eq.condition,
      })),
      pressureReading: data.pressure_reading || null,
      timerSettings: {
        onTime: data.timer_settings?.on_time || '',
        offTime: data.timer_settings?.off_time || '',
        duration: data.timer_settings?.duration || '',
      },
      confidence: 0.85,
    };
  }
}
