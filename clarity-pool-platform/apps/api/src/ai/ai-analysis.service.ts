import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiVisionService } from './gemini-vision.service';
import { ClaudeAnalysisService } from './claude-analysis.service';
import { GoogleMapsService } from './google-maps.service';
import * as Sentry from '@sentry/node';

@Injectable()
export class AIAnalysisService {
  private readonly logger = new Logger(AIAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private gemini: GeminiVisionService,
    private claude: ClaudeAnalysisService,
    private googleMaps: GoogleMapsService,
  ) {}

  async analyzeOnboardingSession(sessionId: string) {
    try {
      const session = await this.prisma.onboardingSession.findUnique({
        where: { id: sessionId },
        include: {
          customer: true,
          aiAnalysis: true,
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Check if analysis already exists
      if (session.aiAnalysis) {
        return session.aiAnalysis;
      }

      // Get related data
      const [waterChemistry, equipment, poolDetails] = await Promise.all([
        this.prisma.waterChemistry.findFirst({
          where: { customerId: session.customerId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.equipment.findFirst({
          where: { customerId: session.customerId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.poolDetails.findUnique({
          where: { customerId: session.customerId },
        }),
      ]);

      // 1. Get satellite view of property
      let satelliteData = null;
      let satelliteAnalysis = null;
      
      try {
        satelliteData = await this.googleMaps.getPoolSatelliteView(
          `${session.customer.address}, ${session.customer.city}, ${session.customer.state} ${session.customer.zipCode}`
        );

        // 2. Analyze satellite image with Gemini
        satelliteAnalysis = await this.gemini.analyzePoolFromSatellite(
          satelliteData.imageData
        );
      } catch (error) {
        this.logger.warn('Satellite analysis skipped', error);
      }

      // 3. Analyze water chemistry with Claude
      let waterAnalysis = null;
      if (waterChemistry) {
        waterAnalysis = await this.claude.analyzeWaterChemistry(waterChemistry);
      }

      // 4. Analyze voice note if present
      let voiceAnalysis = null;
      if (session.voiceNoteUrl) {
        // In production, transcribe with Whisper first
        // For now, use placeholder
        const transcript = "Tech notes about pool condition..."; // TODO: Implement transcription
        voiceAnalysis = await this.claude.transcribeAndAnalyzeVoiceNote(
          transcript,
          session.voiceNoteDuration || 0
        );
      }

      // 5. Analyze equipment photos
      let equipmentAnalysis: any[] = [];
      if (equipment?.pumpPhotoUrls) {
        // TODO: Analyze each photo with Gemini Vision
        this.logger.log('Equipment photo analysis pending implementation');
      }

      // 6. Generate comprehensive report with Claude
      const comprehensiveReport = await this.claude.generateComprehensiveReport(
        {
          customer: session.customer,
          waterChemistry,
          equipment,
          poolDetails,
        },
        equipmentAnalysis,
        voiceAnalysis,
        satelliteAnalysis
      );

      // 7. Save analysis to database
      const savedAnalysis = await this.prisma.aIAnalysis.create({
        data: {
          sessionId,
          overview: comprehensiveReport.executiveSummary || 'Analysis complete',
          waterStatus: waterAnalysis?.status || 'unknown',
          waterIssues: waterAnalysis?.issues || [],
          waterRecs: waterAnalysis?.recommendations || [],
          equipmentStatus: comprehensiveReport.equipmentCondition || 'unknown',
          equipment: equipmentAnalysis,
          maintenanceNeeds: comprehensiveReport.maintenanceItems || [],
          poolDimensions: satelliteAnalysis?.poolDimensions || null,
          propertyFeatures: satelliteAnalysis?.propertyFeatures || null,
          satelliteImageUrl: satelliteData?.satelliteUrl || null,
          immediateWork: comprehensiveReport.immediateActions || [],
          recommendedWork: comprehensiveReport.recommendedWork || [],
          totalImmediate: comprehensiveReport.immediateCost || 0,
          totalRecommended: comprehensiveReport.recommendedCost || 0,
          voiceTranscription: voiceAnalysis?.transcript || null,
          voiceSummary: voiceAnalysis?.summary || null,
          voiceInsights: voiceAnalysis?.keyObservations || null,
          safetyIssues: comprehensiveReport.safetyIssues || [],
          maintenancePlan: comprehensiveReport.maintenanceSchedule || {},
        },
      });

      // Track in Sentry
      Sentry.captureMessage('AI analysis completed', {
        level: 'info',
        extra: {
          sessionId,
          customerId: session.customerId,
          analysisId: savedAnalysis.id,
        },
      });

      return savedAnalysis;
    } catch (error) {
      this.logger.error('AI analysis failed', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  async analyzeEquipmentPhoto(sessionId: string, photoUrl: string, photoBuffer?: Buffer) {
    try {
      const analysis = await this.gemini.analyzeEquipmentPhoto(photoUrl, photoBuffer);
      
      // Update session with equipment analysis
      const session = await this.prisma.onboardingSession.findUnique({
        where: { id: sessionId },
        include: { aiAnalysis: true },
      });

      if (session?.aiAnalysis) {
        const currentEquipment = session.aiAnalysis.equipment as any[] || [];
        currentEquipment.push({
          ...analysis,
          analyzedAt: new Date(),
          photoUrl,
        });

        await this.prisma.aIAnalysis.update({
          where: { id: session.aiAnalysis.id },
          data: {
            equipment: currentEquipment,
            equipmentStatus: this.calculateOverallEquipmentStatus(currentEquipment),
          },
        });
      }
      
      return analysis;
    } catch (error) {
      this.logger.error('Equipment photo analysis failed', error);
      throw error;
    }
  }

  private calculateOverallEquipmentStatus(equipment: any[]): string {
    if (!equipment.length) return 'unknown';
    
    const conditions = equipment.map(e => e.condition);
    if (conditions.includes('poor')) return 'poor';
    if (conditions.includes('fair')) return 'fair';
    if (conditions.includes('good')) return 'good';
    return 'excellent';
  }

  async getPricingRecommendation(sessionId: string) {
    const analysis = await this.prisma.aIAnalysis.findUnique({
      where: { sessionId },
      include: {
        session: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const poolData = {
      volume: 20000, // TODO: Calculate from dimensions
      equipmentCondition: analysis.equipmentStatus,
      treeCoverage: (analysis.propertyFeatures as any)?.treeCoverage || 'moderate',
      waterStatus: analysis.waterStatus,
      specialFactors: analysis.voiceInsights || [],
    };

    const marketData = {
      region: analysis.session.customer.state,
      averagePrice: 150, // TODO: Get from market data
      competition: 'moderate',
    };

    return this.claude.generatePricing(poolData, marketData);
  }
}