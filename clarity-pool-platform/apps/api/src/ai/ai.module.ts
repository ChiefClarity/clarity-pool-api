import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

// Controllers
import { AIAnalysisController } from './ai-analysis.controller';
import { AiController } from './ai.controller';
import { AiHealthController } from './ai-health.controller';

// Services
import { AIAnalysisService } from './ai-analysis.service';
import { GeminiVisionService } from './gemini-vision.service';
import { ClaudeAnalysisService } from './claude-analysis.service';
import { GoogleMapsService } from './google-maps.service';
import { AiService } from './ai.service';
import { GoogleCloudAuthService } from '../common/google-cloud-auth.service';

@Module({
  imports: [ConfigModule, HttpModule, PrismaModule, UploadsModule],
  controllers: [AIAnalysisController, AiController, AiHealthController],
  providers: [
    AIAnalysisService,
    GeminiVisionService,
    ClaudeAnalysisService,
    GoogleMapsService,
    AiService,
    GoogleCloudAuthService,
  ],
  exports: [AIAnalysisService, AiService, GoogleCloudAuthService],
})
export class AIModule {}