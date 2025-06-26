import { Module } from '@nestjs/common';
import { AIAnalysisService } from './ai-analysis.service';
import { GeminiVisionService } from './gemini-vision.service';
import { ClaudeAnalysisService } from './claude-analysis.service';
import { GoogleMapsService } from './google-maps.service';
import { AIAnalysisController } from './ai-analysis.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [AIAnalysisController],
  providers: [
    AIAnalysisService,
    GeminiVisionService,
    ClaudeAnalysisService,
    GoogleMapsService,
  ],
  exports: [AIAnalysisService],
})
export class AIModule {}