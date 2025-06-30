export interface SatelliteAnalysisResponse {
  pool_presence?: boolean;
  pool_present?: boolean;
  approximate_dimensions?: {
    length: string;
    width: string;
  };
  pool_dimensions?: {
    length: string;
    width: string;
  };
  pool_shape?: string;
  poolShape?: string;
  deck_material_condition?: string;
  features?: string[];
  spa_waterfeature?: string[];
  surrounding_landscape?: string;
}

export interface ParsedSatelliteAnalysis {
  poolDetected: boolean;
  poolDimensions?: {
    length: number;
    width: number;
    surfaceArea: number;
  };
  poolShape: 'rectangle' | 'oval' | 'kidney' | 'freeform' | 'round';
  poolFeatures: {
    hasSpillover: boolean;
    hasSpa: boolean;
    hasWaterFeature: boolean;
    hasDeck: boolean;
    deckMaterial: string;
  };
  propertyFeatures: {
    treeCount: number;
    treeProximity: 'close' | 'moderate' | 'far';
    landscapeType: string;
    propertySize: string;
  };
  confidence: number;
}