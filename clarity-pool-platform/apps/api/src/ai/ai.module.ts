import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIAnalysisService } from './ai-analysis.service';
import { GeminiVisionService } from './gemini-vision.service';
import { ClaudeAnalysisService } from './claude-analysis.service';
import { GoogleMapsService } from './google-maps.service';
import { AIAnalysisController } from './ai-analysis.controller';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [ConfigModule, HttpModule, PrismaModule, UploadsModule],
  controllers: [AIAnalysisController, AiController],
  providers: [
    AIAnalysisService,
    GeminiVisionService,
    ClaudeAnalysisService,
    GoogleMapsService,
    AiService,
  ],
  exports: [AIAnalysisService, AiService],
})
export class AIModule {}