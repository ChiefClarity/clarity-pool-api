import { z } from 'zod';

// Define the exact structure we expect from AI
export const SatelliteResponseSchema = z.object({
  pool_presence: z.boolean(),
  pool_present: z.boolean().optional(), // Allow variations
  approximate_dimensions: z.object({
    length: z.union([z.string(), z.number()]),
    width: z.union([z.string(), z.number()]),
  }).optional(),
  pool_dimensions: z.object({
    length: z.union([z.string(), z.number()]),
    width: z.union([z.string(), z.number()]),
    surface_area: z.union([z.string(), z.number()]).optional(),
  }).optional(),
  pool_shape: z.string(),
  poolShape: z.string().optional(),
  deck_material_condition: z.string().optional(),
  deck_present: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  spa_waterfeature: z.array(z.string()).optional(),
  surrounding_landscape: z.string(),
  tree_count: z.number().optional(),
  trees_near_pool: z.boolean().optional(),
  landscape_type: z.string().optional(),
  property_size: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ValidatedSatelliteResponse = z.infer<typeof SatelliteResponseSchema>;