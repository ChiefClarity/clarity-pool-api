import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get('technician/:techId')
  async getTechnicianOffers(
    @Param('techId') techId: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    const technicianId = parseInt(techId);
    const latitude = lat ? parseFloat(lat) : undefined;
    const longitude = lng ? parseFloat(lng) : undefined;
    const searchRadius = radius ? parseFloat(radius) : 25; // Default 25 miles

    return this.offersService.getTechnicianOffers(technicianId, latitude, longitude, searchRadius);
  }

  @Post(':id/accept')
  async acceptOffer(
    @Param('id') id: string,
    @Body() dto: AcceptOfferDto,
  ) {
    return this.offersService.acceptOffer(id, dto);
  }

  @Post(':id/decline')
  async declineOffer(@Param('id') id: string) {
    return this.offersService.declineOffer(id);
  }

  @Post(':id/undo')
  async undoAcceptance(@Param('id') id: string) {
    return this.offersService.undoAcceptance(id);
  }
}