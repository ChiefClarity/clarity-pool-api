import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  CreateCustomerDto,
  PoolbrainCustomerDto,
  mapToPoolbrainCustomer,
} from './dto/poolbrain-customer.dto';
import { JobDetailsResponse } from '../reports/interfaces/report.interface';

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
    zipcode: string; // Widget sends lowercase
    gateCode?: string;
    accessNotes?: string;
    hasDogs?: string;
  };
  waterBodies: Array<{
    waterBodyName: string;
    waterBodyType: number;
    waterBodyGallons?: number | null;
    concerns?: string;
  }>;
}

@Injectable()
export class PoolbrainService {
  private readonly logger = new Logger(PoolbrainService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private httpService: HttpService) {
    this.apiUrl = process.env.POOLBRAIN_API_URL || '';
    this.apiKey = process.env.POOLBRAIN_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn('Poolbrain API key not configured - using mock mode');
    } else {
      this.logger.log(`Poolbrain API configured: ${this.apiUrl}`);
    }
  }

  private transformToPoolbrainFormat(
    widgetData: WidgetData,
  ): PoolbrainCustomerDto {
    this.logger.log('Transforming widget data to Poolbrain format:', {
      widgetZipcode: widgetData.address.zipcode,
      widgetAddress: widgetData.address,
    });

    // Convert WidgetData to CreateCustomerDto format
    const createCustomerDto: CreateCustomerDto = {
      firstName: widgetData.customer.firstName,
      lastName: widgetData.customer.lastName,
      email: widgetData.customer.email,
      phone: widgetData.customer.contactNumber,
      address: widgetData.address.address,
      city: widgetData.address.city,
      state: widgetData.address.state,
      zipCode: widgetData.address.zipcode, // Note: widget sends lowercase, but we map to zipCode
      gateCode: widgetData.address.gateCode,
      accessNotes: widgetData.address.accessNotes,
      hasDogs: widgetData.address.hasDogs || 'no',
    };

    // Get water body gallons from the first water body (if exists)
    const waterBodyGallons =
      widgetData.waterBodies?.[0]?.waterBodyGallons || null;

    // Use the mapper function to transform to Poolbrain format
    const poolbrainData = mapToPoolbrainCustomer({
      ...createCustomerDto,
      waterBodyGallons,
    });

    this.logger.log('Transformed Poolbrain data:', poolbrainData);
    return poolbrainData;
  }

  async createCustomer(widgetData: WidgetData) {
    try {
      // Validate input data
      if (!widgetData?.customer || !widgetData?.address) {
        const error = new Error(
          'Invalid widget data: missing customer or address information',
        );
        this.logger.error('Validation error:', error.message);
        throw error;
      }

      // Check API configuration
      if (!this.apiKey) {
        this.logger.warn(
          'Using mock Poolbrain response (no API key configured)',
        );
        return {
          data: {
            newCustomerAddrId: Math.floor(Math.random() * 10000),
            success: true,
            mock: true,
          },
        };
      }

      // Transform data using our mapper
      let poolbrainPayload: PoolbrainCustomerDto;
      try {
        poolbrainPayload = this.transformToPoolbrainFormat(widgetData);
      } catch (transformError) {
        this.logger.error('Failed to transform widget data:', transformError);
        throw new Error(
          `Data transformation failed: ${transformError.message}`,
        );
      }

      // Log the API call details
      this.logger.log('Creating customer in Poolbrain:', {
        url: `${this.apiUrl}/create_customer`,
        customerEmail: poolbrainPayload.email,
        customerName: `${poolbrainPayload.firstName} ${poolbrainPayload.lastName}`,
      });

      // Make the API call
      const response = await fetch(`${this.apiUrl}/create_customer`, {
        method: 'POST',
        headers: {
          'ACCESS-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(poolbrainPayload),
      });

      // Parse response
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        this.logger.error('Failed to parse Poolbrain response:', parseError);
        throw new Error('Invalid response from Poolbrain API');
      }

      // Handle API errors
      if (!response.ok) {
        const errorMessage = `Poolbrain API error: ${response.status} - ${
          result.message || JSON.stringify(result)
        }`;
        this.logger.error(errorMessage, {
          status: response.status,
          response: result,
        });
        throw new Error(errorMessage);
      }

      // Log success
      this.logger.log('Poolbrain customer created successfully:', {
        customerId: result.data?.newCustomerAddrId,
        success: result.data?.success,
      });

      return result;
    } catch (error) {
      // Enhanced error logging
      this.logger.error('Failed to create customer in Poolbrain:', {
        error: error.message,
        stack: error.stack,
        widgetData: {
          customerEmail: widgetData?.customer?.email,
          customerName: widgetData?.customer
            ? `${widgetData.customer.firstName} ${widgetData.customer.lastName}`
            : 'Unknown',
        },
      });

      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          'Development mode: returning mock response after error',
        );
        return {
          data: {
            newCustomerAddrId: Math.floor(Math.random() * 10000),
            success: true,
            mock: true,
            error: error.message,
          },
        };
      }

      // Re-throw for production
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

  async getTechniciansWithRoutes() {
    if (!this.apiKey) {
      // Return mock data for development
      return [
        {
          id: 'tech-1',
          firstName: 'John',
          lastName: 'Smith',
          maxCapacity: 50,
          currentCapacity: 35,
          completedJobs: 250,
          comfortableWithDogs: true,
          specialEquipmentCertified: true,
          primaryRoute: {
            dayOfWeek: 'Monday',
            stops: [
              { address: '123 Main St, Orlando FL 32801' },
              { address: '456 Oak Ave, Orlando FL 32803' },
              { address: '789 Pine Dr, Orlando FL 32805' },
            ],
          },
        },
        {
          id: 'tech-2',
          firstName: 'Mike',
          lastName: 'Johnson',
          maxCapacity: 45,
          currentCapacity: 42,
          completedJobs: 180,
          comfortableWithDogs: false,
          specialEquipmentCertified: false,
          primaryRoute: {
            dayOfWeek: 'Tuesday',
            stops: [
              { address: '321 Elm St, Winter Park FL 32789' },
              { address: '654 Maple Ave, Winter Park FL 32792' },
            ],
          },
        },
        {
          id: 'tech-3',
          firstName: 'Sarah',
          lastName: 'Williams',
          maxCapacity: 40,
          currentCapacity: 25,
          completedJobs: 320,
          comfortableWithDogs: true,
          specialEquipmentCertified: true,
          primaryRoute: {
            dayOfWeek: 'Wednesday',
            stops: [
              { address: '987 Cedar Ln, Lake Mary FL 32746' },
              { address: '159 Birch Rd, Lake Mary FL 32746' },
              { address: '753 Spruce Ct, Lake Mary FL 32746' },
            ],
          },
        },
      ];
    }

    try {
      this.logger.log('Fetching technicians with routes from Poolbrain');

      const response = await fetch(
        `${this.apiUrl}/get_technicians_with_routes`,
        {
          method: 'GET',
          headers: {
            'ACCESS-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Poolbrain API error: ${response.status} - ${JSON.stringify(result)}`,
        );
      }

      this.logger.log(`Fetched ${result.length} technicians with route data`);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch technicians with routes:', error);

      // Return mock data as fallback
      return [
        {
          id: 'tech-1',
          firstName: 'John',
          lastName: 'Smith',
          maxCapacity: 50,
          currentCapacity: 35,
          completedJobs: 250,
          comfortableWithDogs: true,
          specialEquipmentCertified: true,
          primaryRoute: {
            dayOfWeek: 'Monday',
            stops: [],
          },
        },
      ];
    }
  }

  async getJobDetails(jobIds: number[]): Promise<JobDetailsResponse> {
    if (!this.apiKey) {
      return { data: [], mock: true };
    }

    try {
      this.logger.log(`Fetching job details for IDs: ${jobIds.join(',')}`);

      // Use fetch instead of HttpService to avoid RxJS version conflicts
      const response = await fetch(
        `${this.apiUrl}/route_stops_job_list_details?jobId=${jobIds.join(',')}`,
        {
          method: 'GET',
          headers: {
            'ACCESS-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} - ${JSON.stringify(data)}`,
        );
      }

      this.logger.log(`Retrieved ${data.length} job details`);
      return { data };
    } catch (error) {
      this.logger.error('Failed to fetch job details:', {
        error: error.message,
        jobIds,
      });

      if (process.env.NODE_ENV === 'development') {
        return { data: [], mock: true, error: error.message };
      }

      throw error;
    }
  }
}
