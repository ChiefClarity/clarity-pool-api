export interface Offer {
  id: string;
  customerId: string;
  customerName: string;
  address: string;
  poolSize: string;
  distance: number;
  routeDay: string;
  estimatedDuration: number;
  expiresAt: Date;
  status: 'available' | 'accepted' | 'declined' | 'expired';
  acceptedAt?: Date;
  technicianId?: number;
}
