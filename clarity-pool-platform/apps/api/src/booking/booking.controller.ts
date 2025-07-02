import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service';

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
