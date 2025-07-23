import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service';

interface BookingFilters {
  status?: string;
  technicianId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface BulkAssignmentDto {
  bookingId: string;
  technicianId: string;
  scheduledDate: Date;
  notes?: string;
}

@Controller('api')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Post('booking')
  async createBooking(@Body() bookingData: any) {
    try {
      return await this.bookingService.createBooking(bookingData);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create booking',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Also support the widget's expected endpoint
  @Post('create-customer')
  async createCustomer(@Body() widgetData: any) {
    try {
      return await this.bookingService.createBooking(widgetData);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create customer',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

// New controller for booking management endpoints
@Controller('bookings')
export class BookingManagementController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async getBookings(@Query() filters: BookingFilters) {
    return this.bookingService.findAll(filters);
  }

  @Get(':id')
  async getBooking(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Put(':id/assign')
  async assignTechnician(
    @Param('id') id: string,
    @Body() data: { technicianId: string; scheduledDate: Date; notes?: string },
  ) {
    return this.bookingService.assignTechnicianToBooking(id, data);
  }

  @Post('bulk-assign')
  async bulkAssign(@Body() assignments: BulkAssignmentDto[]) {
    return this.bookingService.bulkAssign(assignments);
  }
}
