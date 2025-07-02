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
import { InitializationStateService } from '../common/initialization-state.service';

// Parsers
import { SatelliteAnalysisParser } from './parsers/satellite-analysis.parser';
import { SurfaceAnalysisParser } from './parsers/surface-analysis.parser';
import { EnvironmentAnalysisParser } from './parsers/environment-analysis.parser';
import { SkimmerAnalysisParser } from './parsers/skimmer-analysis.parser';
import { DeckAnalysisParser } from './parsers/deck-analysis.parser';
import { EquipmentAnalysisParser } from './parsers/equipment-analysis.parser';

@Module({
  imports: [ConfigModule, HttpModule, PrismaModule, UploadsModule],
  controllers: [AIAnalysisController, AiController, AiHealthController],
  providers: [
    InitializationStateService, // Must be first
    GoogleCloudAuthService,
    AIAnalysisService,
    GeminiVisionService,
    ClaudeAnalysisService,
    GoogleMapsService,
    AiService,
    SatelliteAnalysisParser,
    SurfaceAnalysisParser,
    EnvironmentAnalysisParser,
    SkimmerAnalysisParser,
    DeckAnalysisParser,
    EquipmentAnalysisParser,
  ],
  exports: [
    AIAnalysisService,
    AiService,
    GoogleCloudAuthService,
    InitializationStateService,
  ],
})
export class AIModule {}
