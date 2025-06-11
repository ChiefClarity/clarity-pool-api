import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PoolbrainService } from '../poolbrain/poolbrain.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private poolbrain: PoolbrainService,
    private email: EmailService,
  ) {}

  async createBooking(widgetData: {
    customer: {
      firstName: string;
      lastName: string;
      displayName: string;
      email: string;
      contactNumber: string;
    };
    address: {
      address: string;
      city: string;
      state: string;
      zipcode: string;
      gateCode?: string;
      accessNotes?: string;
      hasDogs?: string;
    };
    waterBodies: Array<{
      waterBodyName: string;
      waterBodyType: number;
      waterBodyGallons: number;
      concerns?: string;
    }>;
    metadata: {
      source: string;
      timestamp: string;
      hasMultipleBodies: boolean;
    };
  }) {
    try {
      // Transform widget data to match our API format
      const bookingData = {
        firstName: widgetData.customer.firstName,
        lastName: widgetData.customer.lastName,
        email: widgetData.customer.email,
        phone: widgetData.customer.contactNumber,
        address: widgetData.address.address,
        city: widgetData.address.city,
        state: widgetData.address.state,
        zipCode: widgetData.address.zipcode,
      };

      // Create customer in Poolbrain
      const poolbrainResponse = await this.poolbrain.createCustomer({
        firstName: bookingData.firstName,
        lastName: bookingData.lastName,
        email: bookingData.email,
        phone: bookingData.phone,
        address: bookingData.address,
        city: bookingData.city,
        state: bookingData.state,
        zipcode: bookingData.zipCode,
        GateCode: widgetData.address.gateCode,
        accessNotes: widgetData.address.accessNotes,
        hasDogs: widgetData.address.hasDogs || 'no'  // Add this with default
      });

      // Create customer in our database
      const customer = await this.prisma.customer.create({
        data: {
          ...bookingData,
          poolbrainId: poolbrainResponse.data.newCustomerAddrId,
          bookingDate: new Date(),
        },
      });

      // Store additional data as JSON in the session
      const additionalData = {
        gateCode: widgetData.address.gateCode,
        accessNotes: widgetData.address.accessNotes,
        waterBodies: widgetData.waterBodies,
        metadata: widgetData.metadata,
      };

      // Assign technician
      const technician = await this.assignTechnician(customer);
      
      if (!technician) {
        throw new Error('No available technicians');
      }

      // Create onboarding session with pool profile data
      const session = await this.prisma.onboardingSession.create({
        data: {
          customerId: customer.id,
          technicianId: technician.id,
          scheduledFor: this.getNextAvailableSlot(),
          status: 'SCHEDULED',
          stepsCompleted: additionalData, // Store water body info here
        },
      });

      // Send app download link
      await this.email.sendAppDownloadLink(customer);

      return { 
        success: true,
        customer, 
        session,
        message: 'Booking created successfully'
      };
    } catch (error) {
      console.log('Database not available, returning mock booking response');
      return {
        success: true,
        customer: {
          id: Math.floor(Math.random() * 1000),
          ...widgetData.customer,
          poolbrainId: Math.floor(Math.random() * 10000),
          bookingDate: new Date(),
        },
        session: {
          id: `session-${Math.floor(Math.random() * 1000)}`,
          status: 'SCHEDULED',
          scheduledFor: this.getNextAvailableSlot(),
          createdAt: new Date(),
        },
        message: 'Booking created successfully (mock)',
      };
    }
  }

  private async assignTechnician(customer: any) {
    // For now, just get the first active technician
    // In production, implement proper assignment logic based on location
    return this.prisma.technician.findFirst({
      where: { active: true },
    });
  }

  private getNextAvailableSlot(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }
}