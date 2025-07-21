export interface TechnicianScore {
  total: number;
  factors: {
    proximity: number;
    capacity: number;
    preferredDay: number;
    experience: number;
    specialRequirements: number;
  };
  distance: number;
}

export interface TechnicianData {
  id: number;
  name: string;
  email: string;
  maxCapacity: number;
  currentCapacity: number;
  completedJobs?: number;
  comfortableWithDogs?: boolean;
  specialEquipmentCertified?: boolean;
  primaryRoute?: {
    dayOfWeek: string;
    stops: Array<{ address: string; zip: string }>;
  };
}