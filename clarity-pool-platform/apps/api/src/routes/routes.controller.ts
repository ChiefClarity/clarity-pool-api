import { 
  Controller, 
  Get, 
  Post,
  Body, 
  Param,
  UseGuards,
  UseFilters,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RouteIntelligenceService } from './route-intelligence.service';
import { BookingService } from '../booking/booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingExceptionFilter } from '../common/filters/booking-exception.filter';
import { z } from 'zod';

const RouteAnalysisSchema = z.object({
  address: z.string().min(1),
  preferredDays: z.array(z.string()).min(1).max(7),
});

@Controller('routes')
@UseGuards(JwtAuthGuard)
@UseFilters(BookingExceptionFilter)
export class RoutesController {
  constructor(
    private readonly routeIntelligence: RouteIntelligenceService,
    private readonly bookingService: BookingService,
  ) {}

  @Get('recommend/:bookingId')
  async getRecommendations(@Param('bookingId') bookingId: string) {
    try {
      // Get booking details
      const booking = await this.bookingService.findOne(bookingId);
      
      // Get route recommendations
      const recommendations = await this.routeIntelligence.getRecommendations(
        bookingId, 
        booking
      );
      
      return {
        success: true,
        bookingId,
        recommendations: recommendations.slice(0, 10), // Top 10 recommendations
        metadata: {
          totalTechnicians: recommendations.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get route recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze')
  async analyzeRoute(@Body() data: any) {
    try {
      // Validate input
      const validatedData = RouteAnalysisSchema.parse(data);
      
      // Analyze route options
      const analysis = await this.routeIntelligence.analyzeRouteOptions(validatedData);
      
      return {
        success: true,
        ...analysis,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HttpException(
          {
            message: 'Validation failed',
            errors: error.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to analyze route options',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}