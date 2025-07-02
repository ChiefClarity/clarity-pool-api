import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Offer } from './entities/offer.entity';
import { AcceptOfferDto } from './dto/accept-offer.dto';

@Injectable()
export class OffersService {
  private mockOffers: Map<string, Offer> = new Map();
  private acceptanceTimestamps: Map<string, Date> = new Map();

  constructor(private prisma: PrismaService) {
    this.initializeMockOffers();
  }

  private initializeMockOffers() {
    const floridaCustomers = [
      {
        id: 'offer-001',
        customerId: 'cust-001',
        customerName: 'Maria Rodriguez',
        address: '456 Biscayne Boulevard, Miami, FL 33132',
        poolSize: 'large',
        distance: 5.2,
        routeDay: 'Monday',
        estimatedDuration: 45,
        rating: 4.8,
      },
      {
        id: 'offer-002',
        customerId: 'cust-002',
        customerName: 'James Thompson',
        address: '789 Ocean Drive, Miami Beach, FL 33139',
        poolSize: 'medium',
        distance: 3.8,
        routeDay: 'Tuesday',
        estimatedDuration: 30,
        rating: 4.5,
      },
      {
        id: 'offer-003',
        customerId: 'cust-003',
        customerName: 'Linda Chen',
        address: '321 Las Olas Blvd, Fort Lauderdale, FL 33301',
        poolSize: 'extra-large',
        distance: 12.5,
        routeDay: 'Wednesday',
        estimatedDuration: 60,
        rating: 5.0,
      },
      {
        id: 'offer-004',
        customerId: 'cust-004',
        customerName: 'Robert Garcia',
        address: '555 Coral Way, Coral Gables, FL 33134',
        poolSize: 'small',
        distance: 7.3,
        routeDay: 'Thursday',
        estimatedDuration: 25,
        rating: 4.2,
      },
      {
        id: 'offer-005',
        customerId: 'cust-005',
        customerName: 'Susan Miller',
        address: '888 Sunset Drive, Miami Beach, FL 33140',
        poolSize: 'large',
        distance: 4.1,
        routeDay: 'Friday',
        estimatedDuration: 40,
        rating: 4.9,
      },
    ];

    floridaCustomers.forEach((customer) => {
      const offer: Offer = {
        ...customer,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        status: 'available',
      };
      this.mockOffers.set(offer.id, offer);
    });
  }

  async getTechnicianOffers(
    technicianId: number,
    latitude?: number,
    longitude?: number,
    radius?: number,
  ): Promise<Offer[]> {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      // In production, would query database
      throw new Error('Database implementation pending');
    } catch (error) {
      // Return mock offers
      const offers = Array.from(this.mockOffers.values())
        .filter((offer) => offer.status === 'available')
        .filter((offer) => new Date(offer.expiresAt) > new Date());

      // Calculate scores and sort by score
      const scoredOffers = offers.map((offer) => {
        const distanceScore = 1 / offer.distance;
        const ratingScore = (offer as any).rating || 4.5;
        const score = 0.6 * distanceScore + 0.4 * ratingScore;
        return { ...offer, score };
      });

      return scoredOffers
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...offer }) => offer);
    }
  }

  async acceptOffer(id: string, dto: AcceptOfferDto) {
    const offer = this.mockOffers.get(id);

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'available') {
      throw new BadRequestException('Offer is no longer available');
    }

    if (new Date(offer.expiresAt) < new Date()) {
      offer.status = 'expired';
      throw new BadRequestException('Offer has expired');
    }

    // Mark as accepted
    offer.status = 'accepted';
    offer.acceptedAt = new Date(dto.acceptedAt);
    offer.technicianId = 1; // Mock technician ID

    // Store acceptance timestamp for undo functionality
    this.acceptanceTimestamps.set(id, new Date());

    // In production, would create onboarding session
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 1); // Schedule for tomorrow

    return {
      success: true,
      scheduledFor,
      message: 'Offer accepted successfully',
    };
  }

  async declineOffer(id: string) {
    const offer = this.mockOffers.get(id);

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'available') {
      throw new BadRequestException('Cannot decline this offer');
    }

    offer.status = 'declined';

    return {
      success: true,
      message: 'Offer declined successfully',
    };
  }

  async undoAcceptance(id: string) {
    const offer = this.mockOffers.get(id);

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'accepted') {
      throw new BadRequestException('This offer was not accepted');
    }

    // Check if within 2-minute window
    const acceptedAt = this.acceptanceTimestamps.get(id);
    if (!acceptedAt) {
      throw new BadRequestException('Cannot undo this acceptance');
    }

    const timeSinceAcceptance = Date.now() - acceptedAt.getTime();
    const twoMinutes = 2 * 60 * 1000;

    if (timeSinceAcceptance > twoMinutes) {
      throw new BadRequestException('Undo window has expired (2 minutes)');
    }

    // Restore to available
    offer.status = 'available';
    offer.acceptedAt = undefined;
    offer.technicianId = undefined;
    this.acceptanceTimestamps.delete(id);

    return {
      success: true,
      returnedToPending: true,
      message: 'Acceptance undone successfully',
    };
  }
}
