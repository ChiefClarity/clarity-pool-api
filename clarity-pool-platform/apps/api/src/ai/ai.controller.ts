import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
// @UseGuards(JwtAuthGuard)  // TEMPORARILY DISABLED - Testing 500 error
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('analyze-test-strip')
  async analyzeTestStrip(@Body() body: { image: string; sessionId?: string }) {
    // IMMEDIATE LOGGING
    console.log(
      '🚨 [AI Controller] Request received at:',
      new Date().toISOString(),
    );
    console.log('🚨 [AI Controller] Body keys:', Object.keys(body));
    console.log('🚨 [AI Controller] Image length:', body.image?.length || 0);
    console.log('🚨 [AI Controller] SessionId:', body.sessionId);

    try {
      this.logger.log('Received test strip analysis request');

      // Validate request body
      if (!body.image) {
        throw new BadRequestException('Image is required');
      }

      // Generate sessionId if not provided
      const sessionId = body.sessionId || `session-${Date.now()}`;

      const result = await this.aiService.analyzeTestStrip(
        body.image,
        sessionId,
      );
      return result;
    } catch (error) {
      this.logger.error('Test strip analysis error:', error);
      this.logger.error('Error stack:', error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // For debugging, return the actual error details
      throw new HttpException(
        {
          statusCode: 500,
          message: error.message || 'Failed to analyze test strip',
          error: 'Internal Server Error',
          // Add detailed error info for debugging
          details: {
            actualError: error.message,
            type: error.constructor.name,
            // Only in development
            stack:
              process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-pool-satellite')
  async analyzePoolSatellite(
    @Body() body: { address: string; sessionId: string },
  ) {
    console.log('🛰️ [AI Controller] Received satellite analysis request:', {
      address: body.address,
      sessionId: body.sessionId,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.aiService.analyzePoolSatellite(
        body.address,
        body.sessionId,
      );
      console.log('✅ [AI Controller] Satellite analysis complete:', {
        success: result.success,
        hasLocation: !!result.location,
        hasAnalysis: !!result.analysis,
        poolDetected: result.analysis?.poolDetected,
      });
      return result;
    } catch (error) {
      console.error('❌ [AI Controller] Satellite analysis failed:', error);
      throw error;
    }
  }

  @Post('analyze-equipment')
  async analyzeEquipment(
    @Body()
    body: {
      image?: string;
      images?: string[]; // Add support for multiple images
      sessionId: string;
      equipmentType?: string;
    },
  ) {
    this.logger.log('Received equipment analysis request');

    // Support both single image (legacy) and multiple images
    const images = body.images || (body.image ? [body.image] : []);

    if (images.length === 0) {
      throw new BadRequestException('No images provided for analysis');
    }

    return this.aiService.analyzeEquipment(
      images,
      body.sessionId,
      body.equipmentType,
    );
  }

  @Post('generate-chemistry-insights')
  async generateChemistryInsights(
    @Body() body: { readings: any; sessionId: string },
  ) {
    this.logger.log('Received chemistry insights request');
    return this.aiService.generateWaterChemistryInsights(
      body.readings,
      body.sessionId,
    );
  }

  @Post('transcribe-voice-note')
  async transcribeVoiceNote(
    @Body()
    dto: {
      audio: string; // base64
      sessionId: string;
      language?: string;
    },
  ) {
    this.logger.log('🎙️ [AI Controller] Voice note transcription requested:', {
      sessionId: dto.sessionId,
      language: dto.language || 'en-US',
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.aiService.transcribeVoiceNote(
        dto.audio,
        dto.sessionId,
        dto.language || 'en-US',
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error('Voice transcription failed:', error);
      throw error;
    }
  }

  @Post('analyze-pool-surface')
  async analyzePoolSurface(@Body() body: { image: string; sessionId: string }) {
    this.logger.log('Received pool surface analysis request');
    return this.aiService.analyzePoolSurface(body.image, body.sessionId);
  }

  @Post('analyze-environment')
  async analyzeEnvironment(
    @Body() body: { images: string[]; sessionId: string },
  ) {
    this.logger.log('Received environment analysis request');
    return this.aiService.analyzePoolEnvironment(body.images, body.sessionId);
  }

  @Post('analyze-skimmers')
  async analyzeSkimmers(@Body() body: { images: string[]; sessionId: string }) {
    this.logger.log('Received skimmer analysis request');
    return this.aiService.analyzeSkimmers(body.images, body.sessionId);
  }

  @Post('analyze-deck')
  async analyzeDeck(@Body() body: { images: string[]; sessionId: string }) {
    this.logger.log('Received deck analysis request');
    return this.aiService.analyzeDeck(body.images, body.sessionId);
  }

  @Post('analyze-weather-pollen')
  async analyzeWeatherPollen(@Body() dto: { address: string }) {
    this.logger.log('🌤️ [AI Controller] Weather/Pollen request received:', {
      address: dto.address,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.aiService.analyzeWeatherPollen(dto.address);

      this.logger.log('🌤️ [AI Controller] Weather/Pollen analysis complete:', {
        address: dto.address,
        success: result.success,
        rainfall: result.data?.avgRainfall,
        pollenLevel: result.data?.pollenData?.currentLevel,
        pollenTypes: result.data?.pollenData?.mainTypes,
      });

      return result;
    } catch (error) {
      this.logger.error(
        '❌ [AI Controller] Weather/Pollen analysis failed:',
        error,
      );
      throw error;
    }
  }
}
