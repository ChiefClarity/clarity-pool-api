export interface TestStripReading {
  freeChlorine?: number | null;
  totalChlorine?: number | null;
  bromine?: number | null;
  ph?: number | null;
  alkalinity?: number | null;
  totalHardness?: number | null;
  calcium?: number | null;
  cyanuricAcid?: number | null;
  copper?: number | null;
  iron?: number | null;
  nitrate?: number | null;
  nitrite?: number | null;
  phosphates?: number | null;
  salt?: number | null;
  biguanide?: number | null;
  ammonia?: number | null;
  tds?: number | null;
  orp?: number | null;
  temperature?: number | null;
}

export interface StripInfo {
  padCount: number;
  identifiedParameters: string[];
  manufacturer?: string;
  model?: string;
}

export interface TestStripAnalysisResult {
  readings: TestStripReading;
  stripInfo: StripInfo;
  confidence: number;
  notes: string;
  imageUrl: string;
  thumbnailUrl: string;
  analyzedBy: string;
  analyzedAt: string;
  sessionId: string;
}