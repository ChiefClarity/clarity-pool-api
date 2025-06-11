import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('api/onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get('technician/:technicianId/sessions')
  async getTechnicianSessions(@Param('technicianId') technicianId: string) {
    return this.onboardingService.getTechnicianSessions(parseInt(technicianId));
  }

  @Post('sessions/:sessionId/start')
  async startSession(@Param('sessionId') sessionId: string) {
    return this.onboardingService.startSession(sessionId);
  }

  @Put('sessions/:sessionId/water-chemistry')
  async saveWaterChemistry(
    @Param('sessionId') sessionId: string,
    @Body() data: any,
  ) {
    return this.onboardingService.saveWaterChemistry(sessionId, data);
  }

  @Put('sessions/:sessionId/media')
  async saveMedia(
    @Param('sessionId') sessionId: string,
    @Body() data: any,
  ) {
    return this.onboardingService.saveMedia(sessionId, data);
  }

  @Put('sessions/:sessionId/pool-details')
  async savePoolDetails(
    @Param('sessionId') sessionId: string,
    @Body() data: any,
  ) {
    return this.onboardingService.savePoolDetails(sessionId, data);
  }

  @Post('sessions/:sessionId/complete')
  async completeSession(@Param('sessionId') sessionId: string) {
    return this.onboardingService.completeSession(sessionId);
  }
}