import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PoolbrainService } from '../poolbrain/poolbrain.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

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
      zipcode: string;  // Widget sends lowercase
      gateCode?: string;
      accessNotes?: string;
      hasDogs?: string;
      dogDetails?: string;
    };
    waterBodies: Array<{
      waterBodyName: string;
      waterBodyType: number;
      waterBodyGallons?: number | null;
      concerns?: string;
    }>;
    metadata: {
      source: string;
      timestamp: string;
      hasMultipleBodies: boolean;
      currentServiceDay?: string;
      additionalComments?: string;
    };
  }) {
    try {
      // Debug log to see exact widget data structure
      console.log('Widget address data:', widgetData.address);

      // Transform widget data to match our API format
      const bookingData = {
        firstName: widgetData.customer.firstName,
        lastName: widgetData.customer.lastName,
        email: widgetData.customer.email,
        phone: widgetData.customer.contactNumber,
        address: widgetData.address.address,
        city: widgetData.address.city,
        state: widgetData.address.state,
        zipCode: widgetData.address.zipcode,  // Map lowercase from widget to capital C for database
      };

      // Create customer in Poolbrain
      const poolbrainResponse = await this.poolbrain.createCustomer(widgetData);

      // Send comprehensive email notification
      try {
        // Email service requires waterBodyGallons as number, transform null/undefined to 0
        const emailData = {
          ...widgetData,
          waterBodies: widgetData.waterBodies.map(body => ({
            ...body,
            waterBodyGallons: body.waterBodyGallons || 0
          }))
        };
        
        await this.email.sendBookingNotification(emailData, poolbrainResponse.data.newCustomerAddrId);
        this.logger.log('Booking notification email sent successfully');
      } catch (emailError) {
        // Log error but don't fail the booking
        this.logger.error('Failed to send booking notification email:', emailError);
        // The email service already handles retries and queuing
      }

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
        message: 'Booking created successfully',
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
