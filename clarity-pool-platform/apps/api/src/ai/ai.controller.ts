import { 
  Controller, 
  Post, 
  Body, 
  UseGuards,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('analyze-test-strip')
  async analyzeTestStrip(@Body() body: { image: string; sessionId: string }) {
    this.logger.log('Received test strip analysis request');
    return this.aiService.analyzeTestStrip(body.image, body.sessionId);
  }

  @Post('analyze-pool-satellite')
  async analyzePoolSatellite(@Body() body: { address: string; sessionId: string }) {
    this.logger.log('Received pool satellite analysis request');
    return this.aiService.analyzePoolSatellite(body.address, body.sessionId);
  }

  @Post('analyze-equipment')
  async analyzeEquipment(@Body() body: { image: string; sessionId: string; equipmentType?: string }) {
    this.logger.log('Received equipment analysis request');
    return this.aiService.analyzeEquipment(body.image, body.sessionId, body.equipmentType);
  }

  @Post('generate-chemistry-insights')
  async generateChemistryInsights(@Body() body: { readings: any; sessionId: string }) {
    this.logger.log('Received chemistry insights request');
    return this.aiService.generateWaterChemistryInsights(body.readings, body.sessionId);
  }

  @Post('transcribe-voice-note')
  async transcribeVoiceNote(@Body() body: { audio: string; sessionId: string }) {
    this.logger.log('Received voice transcription request');
    return this.aiService.transcribeVoiceNote(body.audio, body.sessionId);
  }

  @Post('analyze-pool-surface')
  async analyzePoolSurface(@Body() body: { image: string; sessionId: string }) {
    this.logger.log('Received pool surface analysis request');
    return this.aiService.analyzePoolSurface(body.image, body.sessionId);
  }

  @Post('analyze-environment')
  async analyzeEnvironment(@Body() body: { images: string[]; sessionId: string }) {
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
}