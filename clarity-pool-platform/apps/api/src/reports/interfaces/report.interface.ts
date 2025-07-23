export interface ChemistryReadings {
  chlorine: number;
  ph: number;
  alkalinity: number;
  calcium: number;
  cyanuricAcid: number;
  salt?: number;
  tds?: number;
  phosphates?: number;
  copper?: number;
  iron?: number;
}

export interface ChemistryTrend {
  parameter: keyof ChemistryReadings;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  isInRange: boolean;
}

export interface EquipmentStatus {
  pump: {
    status: 'operational' | 'warning' | 'critical';
    lastService: Date;
    issues: string[];
  };
  filter: {
    status: 'operational' | 'warning' | 'critical';
    lastCleaning: Date;
    pressure: number;
  };
  heater?: {
    status: 'operational' | 'warning' | 'critical';
    temperature: number;
  };
  sanitizer?: {
    type: 'chlorinator' | 'salt' | 'uv' | 'ozone';
    status: 'operational' | 'warning' | 'critical';
  };
}

export interface EnvironmentData {
  temperature: number;
  conditions: string;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: Date;
  temp: number;
  conditions: string;
  precipitation: number;
}

export interface PoolHealthScore {
  overall: number;
  chemistry: number;
  equipment: number;
  environment: number;
  details: {
    positives: string[];
    concerns: string[];
    recommendations: string[];
  };
}

export interface WeeklyReportData {
  jobId: number;
  customerName: string;
  customerEmail: string;
  poolAddress: string;
  serviceDate: Date;
  technicianName: string;

  healthScore: number;
  healthDetails: PoolHealthScore;

  chemistry: ChemistryReadings;
  chemistryTrends: ChemistryTrend[];

  equipment: EquipmentStatus;
  weather: EnvironmentData;

  servicesPerformed: string[];
  chemicalsAdded: Array<{
    chemical: string;
    amount: string;
    reason: string;
  }>;

  notes: string;
  recommendations: string[];

  nextServiceDate?: Date;
  urgentIssues: string[];
}

export interface ReportPreferences {
  enabled: boolean;
  reportDelay: number;
  includeCharts: boolean;
}

export interface JobDetailsResponse {
  data: any[];
  mock?: boolean;
  error?: string;
}
