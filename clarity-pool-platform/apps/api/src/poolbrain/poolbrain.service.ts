import { Injectable, Logger } from '@nestjs/common';

interface PoolbrainCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;  // Their format
  GateCode?: string;
  accessNotes?: string;
  hasDogs: string;
}

interface WidgetData {
  customer: {
    firstName: string;
    lastName: string;
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
  };
}

@Injectable()
export class PoolbrainService {
  private readonly logger = new Logger(PoolbrainService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = process.env.POOLBRAIN_API_URL || '';
    this.apiKey = process.env.POOLBRAIN_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn('Poolbrain API key not configured - using mock mode');
    } else {
      this.logger.log(`Poolbrain API configured: ${this.apiUrl}`);
    }
  }

  private transformToPoolbrainFormat(widgetData: WidgetData): PoolbrainCustomerDto {
    this.logger.log('Transforming widget data to Poolbrain format:', {
      widgetZipcode: widgetData.address.zipcode,
      widgetAddress: widgetData.address,
    });

    const poolbrainData = {
      firstName: widgetData.customer.firstName,
      lastName: widgetData.customer.lastName,
      email: widgetData.customer.email,
      phone: widgetData.customer.contactNumber,
      address: widgetData.address.address,
      city: widgetData.address.city,
      state: widgetData.address.state,
      zipcode: widgetData.address.zipcode,  // Both widget and Poolbrain use lowercase
      GateCode: widgetData.address.gateCode,
      accessNotes: widgetData.address.accessNotes,
      hasDogs: widgetData.address.hasDogs || 'no',
    };

    this.logger.log('Transformed Poolbrain data:', poolbrainData);
    return poolbrainData;
  }

  async createCustomer(widgetData: WidgetData) {
    if (!this.apiKey) {
      this.logger.log('Using mock Poolbrain response (no API key)');
      return {
        data: {
          newCustomerAddrId: Math.floor(Math.random() * 10000),
          success: true,
        },
      };
    }

    const poolbrainPayload = this.transformToPoolbrainFormat(widgetData);

    try {
      this.logger.log('Creating customer in Poolbrain:', {
        url: `${this.apiUrl}/create_customer`,
        data: poolbrainPayload,
      });

      // Use native fetch instead of HttpService
      const response = await fetch(`${this.apiUrl}/create_customer`, {
        method: 'POST',
        headers: {
          'ACCESS-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(poolbrainPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`,
        );
      }

      this.logger.log('Poolbrain customer created successfully:', result);
      return result;
    } catch (error) {
      this.logger.error('Poolbrain API error:', error);

      if (process.env.NODE_ENV === 'development') {
        this.logger.log('Falling back to mock response due to API error');
        return {
          data: {
            newCustomerAddrId: Math.floor(Math.random() * 10000),
            success: true,
            error: error.message,
          },
        };
      }

      throw error;
    }
  }

  async updateCustomerPoolDetails(customerId: number, details: any) {
    if (!this.apiKey) {
      return { success: true, mock: true };
    }

    try {
      this.logger.log('Updating pool details for customer:', customerId);

      const response = await fetch(`${this.apiUrl}/update_pool_details`, {
        method: 'POST',
        headers: {
          'ACCESS-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, ...details }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`,
        );
      }

      this.logger.log('Pool details updated successfully:', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to update pool details:', error);
      if (process.env.NODE_ENV === 'development') {
        return { success: true, mock: true, error: error.message };
      }
      throw error;
    }
  }

  async createServiceRecord(customerId: number, waterChemistry: any) {
    if (!this.apiKey) {
      return { success: true, mock: true };
    }

    try {
      this.logger.log('Creating service record for customer:', customerId);

      const response = await fetch(`${this.apiUrl}/create_service_record`, {
        method: 'POST',
        headers: {
          'ACCESS-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, ...waterChemistry }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`,
        );
      }

      this.logger.log('Service record created successfully:', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to create service record:', error);
      if (process.env.NODE_ENV === 'development') {
        return { success: true, mock: true, error: error.message };
      }
      throw error;
    }
  }
}
