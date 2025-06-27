import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Request as Req, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from '../ai/ai.service';

@Controller('api/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private onboardingService: OnboardingService,
    private aiService: AiService
  ) {}

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
    @Body() body: { 
      readings?: any;
      testStripImage?: string;
      notes?: string;
    },
    @Req() req: any
  ) {
    this.logger.log(`Updating water chemistry for session: ${sessionId}`);
    
    let finalReadings = body.readings;
    let analysisResult = null;

    // If test strip image provided, analyze it
    if (body.testStripImage) {
      analysisResult = await this.aiService.analyzeTestStrip(body.testStripImage, sessionId);
      finalReadings = analysisResult.readings;
    }

    // Generate insights if we have readings
    let insights = null;
    if (finalReadings) {
      insights = await this.aiService.generateWaterChemistryInsights(finalReadings, sessionId);
    }

    // Save to database
    const data = {
      readings: finalReadings,
      testStripImageUrl: analysisResult?.imageUrl,
      insights: insights?.insights,
      notes: body.notes,
      analyzedAt: new Date(),
    };

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

  @Post('sessions/:sessionId/analyze-pool-location')
  async analyzePoolLocation(
    @Param('sessionId') sessionId: string,
    @Body() body: { address: string },
    @Req() req: any
  ) {
    this.logger.log(`Analyzing pool location for session: ${sessionId}`);
    
    const analysis = await this.aiService.analyzePoolSatellite(body.address, sessionId);
    
    // Save analysis to session
    const data = {
      satelliteImageUrl: analysis.satelliteImageUrl,
      location: analysis.location,
      features: analysis.analysis.features,
      analyzedAt: new Date(),
    };

    await this.onboardingService.savePoolDetails(sessionId, data);

    return analysis;
  }

  @Post('sessions/:sessionId/analyze-equipment')
  async analyzeEquipment(
    @Param('sessionId') sessionId: string,
    @Body() body: { image: string; equipmentType?: string },
    @Req() req: any
  ) {
    this.logger.log(`Analyzing equipment for session: ${sessionId}`);
    
    return this.aiService.analyzeEquipment(body.image, sessionId, body.equipmentType);
  }

  @Post('sessions/:sessionId/analyze-pool-surface')
  async analyzePoolSurface(
    @Param('sessionId') sessionId: string,
    @Body() body: { image: string },
    @Req() req: any
  ) {
    this.logger.log(`Analyzing pool surface for session: ${sessionId}`);
    
    return this.aiService.analyzePoolSurface(body.image, sessionId);
  }

  @Post('sessions/:sessionId/analyze-environment')
  async analyzeEnvironment(
    @Param('sessionId') sessionId: string,
    @Body() body: { images: string[] },
    @Req() req: any
  ) {
    this.logger.log(`Analyzing environment for session: ${sessionId}`);
    
    return this.aiService.analyzePoolEnvironment(body.images, sessionId);
  }

  @Post('sessions/:sessionId/analyze-skimmers')
  async analyzeSkimmers(
    @Param('sessionId') sessionId: string,
    @Body() body: { images: string[] },
    @Req() req: any
  ) {
    this.logger.log(`Analyzing skimmers for session: ${sessionId}`);
    
    return this.aiService.analyzeSkimmers(body.images, sessionId);
  }

  @Post('sessions/:sessionId/analyze-deck')
  async analyzeDeck(
    @Param('sessionId') sessionId: string,
    @Body() body: { images: string[] },
    @Req() req: any
  ) {
    this.logger.log(`Analyzing deck for session: ${sessionId}`);
    
    return this.aiService.analyzeDeck(body.images, sessionId);
  }
}