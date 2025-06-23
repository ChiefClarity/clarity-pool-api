import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get('sessions/technician/:technicianId')
  async getTechnicianSessions(@Param('technicianId') technicianId: string) {
    return this.onboardingService.getTechnicianSessions(parseInt(technicianId));
  }

  @Get('sessions/:sessionId')
  async getSessionById(@Param('sessionId') sessionId: string) {
    return this.onboardingService.getSessionById(sessionId);
  }

  @Put('sessions/:sessionId/start')
  async startSession(@Param('sessionId') sessionId: string) {
    return this.onboardingService.startSession(sessionId);
  }

  @Post('sessions/:sessionId/voice-note')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadVoiceNote(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: any,
  ) {
    return this.onboardingService.uploadVoiceNote(sessionId, file);
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