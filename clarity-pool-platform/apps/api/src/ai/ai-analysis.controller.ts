import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  Body, 
  UseGuards, 
  UploadedFile, 
  UseInterceptors,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIAnalysisService } from './ai-analysis.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AIAnalysisController {
  constructor(
    private aiService: AIAnalysisService,
    private prisma: PrismaService,
  ) {}

  @Post('analysis/session/:id')
  async analyzeSession(@Param('id') id: string) {
    const analysis = await this.aiService.analyzeOnboardingSession(id);
    return {
      success: true,
      analysisId: analysis.id,
      message: 'Analysis complete. CSM review required before customer delivery.',
    };
  }

  @Get('analysis/session/:id')
  async getAnalysis(@Param('id') id: string) {
    const analysis = await this.prisma.aIAnalysis.findUnique({
      where: { sessionId: id },
      include: {
        session: {
          include: {
            customer: true,
            technician: true,
          },
        },
      },
    });
    
    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }
    
    return analysis;
  }

  @Post('analyze-equipment-photo')
  @UseInterceptors(FileInterceptor('photo'))
  async analyzeEquipmentPhoto(
    @Body('sessionId') sessionId: string,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    if (!photo) {
      throw new BadRequestException('Photo is required');
    }

    const analysis = await this.aiService.analyzeEquipmentPhoto(
      sessionId,
      '', // Empty string instead of null for photoUrl
      photo.buffer
    );
    
    return {
      success: true,
      analysis,
    };
  }

  @Post('transcribe-voice')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeVoice(
    @Body('sessionId') sessionId: string,
    @Body('duration') duration: number,
    @UploadedFile() audio: Express.Multer.File,
  ) {
    if (!audio) {
      throw new BadRequestException('Audio file is required');
    }

    // TODO: Implement Whisper transcription
    // For now, return mock
    return {
      success: true,
      transcription: 'Mock transcription of pool technician notes',
      duration: parseInt(duration.toString()),
    };
  }

  @Get('analysis/:id/approve')
  async approveAnalysis(@Param('id') id: string) {
    const analysis = await this.prisma.aIAnalysis.update({
      where: { id: parseInt(id) },
      data: {
        approvedByCsm: true,
        analyzedAt: new Date(),
      },
    });

    return {
      success: true,
      analysis,
    };
  }

  @Post('analysis/:id/csm-notes')
  async addCsmNotes(
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    const analysis = await this.prisma.aIAnalysis.update({
      where: { id: parseInt(id) },
      data: {
        csmNotes: notes,
      },
    });

    return {
      success: true,
      analysis,
    };
  }

  @Get('pricing/session/:id')
  async getPricingRecommendation(@Param('id') id: string) {
    const pricing = await this.aiService.getPricingRecommendation(id);
    return {
      success: true,
      pricing,
    };
  }

  @Get('stats')
  async getAIStats() {
    const [totalAnalyses, pendingApproval, averageProcessingTime] = await Promise.all([
      this.prisma.aIAnalysis.count(),
      this.prisma.aIAnalysis.count({
        where: { approvedByCsm: false },
      }),
      // Calculate average processing time
      this.prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM ("analyzedAt" - "createdAt"))) as avg_seconds
        FROM "AIAnalysis"
        WHERE "analyzedAt" IS NOT NULL
      `,
    ]);

    return {
      totalAnalyses,
      pendingApproval,
      averageProcessingTime: (averageProcessingTime as any)[0]?.avg_seconds || 0,
      aiServicesStatus: {
        gemini: !!process.env.GEMINI_API_KEY,
        claude: !!process.env.ANTHROPIC_API_KEY,
        googleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
      },
    };
  }
}