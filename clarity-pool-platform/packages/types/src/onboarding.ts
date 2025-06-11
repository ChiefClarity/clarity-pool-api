export interface OnboardingSession {
  id: string;
  customerId: string;
  technicianId: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  data: {
    customerInfo?: any;
    mediaCapture?: any;
    waterAnalysis?: any;
    poolProfile?: any;
    equipmentScan?: any;
  };
}
