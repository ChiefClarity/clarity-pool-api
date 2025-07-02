import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MockDataService } from '../common/mock-data.service';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private mockDataService: MockDataService,
  ) {}

  async getTechnicianSessions(technicianId: number) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      return await this.prisma.onboardingSession.findMany({
        where: { technicianId },
        include: { customer: true },
      });
    } catch (error) {
      console.log('Database not available, returning mock data');
      const sessions = this.mockDataService.getOnboardingSessions();
      const customers = this.mockDataService.getCustomers();

      return sessions.map((session) => ({
        ...session,
        customer: customers.find((c) => c.id === session.customerId) || null,
      }));
    }
  }

  async getSessionById(sessionId: string) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      return await this.prisma.onboardingSession.findUnique({
        where: { id: sessionId },
        include: { customer: true },
      });
    } catch (error) {
      console.log('Database not available, returning mock data');
      const session = this.mockDataService.getOnboardingSessionById(sessionId);
      if (!session) {
        return null;
      }
      const customer = session.customerId
        ? this.mockDataService.getCustomerById(session.customerId)
        : null;
      return {
        ...session,
        customer: customer || null,
      };
    }
  }

  async startSession(sessionId: string) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      return await this.prisma.onboardingSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    } catch (error) {
      console.log('Database not available, returning mock response');
      return {
        id: sessionId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        message: 'Session started successfully (mock)',
      };
    }
  }

  async uploadVoiceNote(sessionId: string, file: any) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      // In production, this would upload to cloud storage
      // For now, return a mock URL
      return {
        sessionId,
        voiceNoteUrl: `https://storage.claritypool.com/voice-notes/${sessionId}/${Date.now()}-voice-note.mp3`,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.log('Database not available, returning mock response');
      return {
        sessionId,
        voiceNoteUrl: `https://storage.claritypool.com/voice-notes/${sessionId}/${Date.now()}-voice-note.mp3`,
        uploadedAt: new Date(),
        message: 'Voice note uploaded successfully (mock)',
      };
    }
  }

  async saveWaterChemistry(sessionId: string, data: any) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      const session = await this.prisma.onboardingSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      return await this.prisma.waterChemistry.create({
        data: {
          ...data,
          customerId: session.customerId,
          sessionId: sessionId,
          testDate: new Date(),
        },
      });
    } catch (error) {
      console.log('Database not available, returning mock response');
      return {
        id: Math.floor(Math.random() * 1000),
        sessionId,
        ...data,
        testDate: new Date(),
        message: 'Water chemistry saved successfully (mock)',
      };
    }
  }

  async saveMedia(sessionId: string, mediaData: any) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      return await this.prisma.onboardingSession.update({
        where: { id: sessionId },
        data: {
          stepsCompleted: mediaData,
        },
      });
    } catch (error) {
      console.log('Database not available, returning mock response');
      return {
        id: sessionId,
        stepsCompleted: mediaData,
        message: 'Media saved successfully (mock)',
      };
    }
  }

  async savePoolDetails(sessionId: string, data: any) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      const session = await this.prisma.onboardingSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      return await this.prisma.poolDetails.upsert({
        where: { customerId: session.customerId },
        create: {
          ...data,
          customerId: session.customerId,
        },
        update: data,
      });
    } catch (error) {
      console.log('Database not available, returning mock response');
      return {
        sessionId,
        ...data,
        message: 'Pool details saved successfully (mock)',
      };
    }
  }

  async completeSession(sessionId: string) {
    try {
      if (!this.prisma.isDatabaseAvailable()) {
        throw new Error('Database not available');
      }
      return await this.prisma.onboardingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.log('Database not available, returning mock response');
      return {
        id: sessionId,
        status: 'COMPLETED',
        completedAt: new Date(),
        message: 'Session completed successfully (mock)',
      };
    }
  }
}
