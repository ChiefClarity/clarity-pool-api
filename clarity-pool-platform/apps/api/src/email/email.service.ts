import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { BookingEmailTemplate } from './templates/booking-notification.template';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

interface BookingData {
  customer: {
    firstName: string;
    lastName: string;
    displayName?: string;
    email: string;
    contactNumber: string;
  };
  address: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    gateCode?: string;
    accessNotes?: string;
    hasDogs?: string;
    dogDetails?: string;
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
    currentServiceDay?: string;
    additionalComments?: string;
  };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Start with 1 second
  
  constructor(
    private configService: ConfigService,
    private emailTemplate: BookingEmailTemplate,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('GMAIL_USER'),
          pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
        },
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5, // Max 5 messages per second
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Gmail SMTP connection failed:', error);
        } else {
          this.logger.log('Gmail SMTP connection established successfully');
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
      throw new Error('Email service initialization failed');
    }
  }

  async sendBookingNotification(
    bookingData: BookingData,
    poolbrainCustomerId: number,
  ): Promise<boolean> {
    try {
      // Validate input data
      this.validateBookingData(bookingData);

      // Prepare email content
      const emailContent = this.emailTemplate.generateBookingEmail(
        bookingData,
        poolbrainCustomerId,
      );

      // Email configuration
      const frontChannelEmail = this.configService.get<string>('FRONT_CHANNEL_EMAIL');
      if (!frontChannelEmail) {
        throw new Error('FRONT_CHANNEL_EMAIL environment variable is not configured');
      }

      const mailOptions: EmailOptions = {
        to: frontChannelEmail,
        subject: this.generateSubject(bookingData),
        html: emailContent.html,
        text: emailContent.text,
        cc: this.configService.get<string>('CC_EMAILS')?.split(',') || [],
      };

      // Send with retry logic
      const result = await this.sendWithRetry(mailOptions);
      
      if (result.success) {
        this.logger.log(
          `Booking notification sent successfully for customer ${poolbrainCustomerId}`,
          {
            messageId: result.messageId,
            response: result.response,
          },
        );
        return true;
      } else {
        throw new Error(result.error || 'Email send failed');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send booking notification for customer ${poolbrainCustomerId}:`,
        error,
      );
      
      // Queue for retry (in production, save to database)
      await this.queueFailedEmail(bookingData, poolbrainCustomerId, error);
      
      // Don't throw - we don't want to break the booking flow
      return false;
    }
  }

  private async sendWithRetry(
    mailOptions: EmailOptions,
    attempt = 1,
  ): Promise<{ success: boolean; messageId?: string; response?: string; error?: string }> {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      this.logger.warn(
        `Email send attempt ${attempt} failed:`,
        error.message,
      );

      if (attempt < this.maxRetries) {
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        
        return this.sendWithRetry(mailOptions, attempt + 1);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private validateBookingData(data: BookingData): void {
    const errors: string[] = [];

    // Required fields validation
    if (!data.customer?.firstName) errors.push('Customer first name is required');
    if (!data.customer?.lastName) errors.push('Customer last name is required');
    if (!data.customer?.email) errors.push('Customer email is required');
    if (!data.address?.address) errors.push('Address is required');
    if (!data.address?.city) errors.push('City is required');
    if (!data.address?.state) errors.push('State is required');
    if (!data.address?.zipCode) errors.push('Zip code is required');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.customer?.email && !emailRegex.test(data.customer.email)) {
      errors.push('Invalid email format');
    }

    // Phone format validation (optional but validate if provided)
    if (data.customer?.contactNumber) {
      const phoneRegex = /^\d{10}$/;
      const cleanPhone = data.customer.contactNumber.replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        errors.push('Invalid phone number format');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private generateSubject(data: BookingData): string {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const priority = data.address.hasDogs === 'yes' ? '🐕 URGENT - ' : '🏊 ';
    const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
    const location = data.address.city;

    return `${priority}New Analysis Booking - ${customerName} - ${location} - ${timestamp}`;
  }

  private async queueFailedEmail(
    data: BookingData,
    customerId: number,
    error: any,
  ): Promise<void> {
    // In production, save to database for manual processing
    const failedEmail = {
      customerId,
      bookingData: data,
      error: error.message,
      attemptedAt: new Date(),
      stack: error.stack,
    };

    this.logger.error('Queuing failed email for manual processing:', failedEmail);
    
    // TODO: Save to database
    // await this.prisma.failedEmail.create({ data: failedEmail });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email configuration test passed');
      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed:', error);
      return false;
    }
  }

  // Keep existing methods for backward compatibility
  async sendAppDownloadLink(customer: any) {
    console.log(`Sending app download link to ${customer.email}`);
    return { sent: true };
  }

  async sendOnboardingComplete(customer: any) {
    console.log(`Sending onboarding complete email to ${customer.email}`);
    return { sent: true };
  }
}