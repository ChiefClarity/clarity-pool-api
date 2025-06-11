import { Injectable, Logger } from '@nestjs/common';

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

  async createCustomer(data: any) {
    if (!this.apiKey) {
      this.logger.log('Using mock Poolbrain response (no API key)');
      return {
        data: {
          newCustomerAddrId: Math.floor(Math.random() * 10000),
          success: true,
        },
      };
    }

    try {
      this.logger.log('Creating customer in Poolbrain:', {
        url: `${this.apiUrl}/create_customer`,
        data: data,
      });

      // Use native fetch instead of HttpService
      const response = await fetch(`${this.apiUrl}/create_customer`, {
        method: 'POST',
        headers: {
          'ACCESS-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`);
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
        throw new Error(`Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`);
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
        throw new Error(`Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`);
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