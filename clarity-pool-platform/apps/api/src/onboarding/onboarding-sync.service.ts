import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PoolbrainService } from '../poolbrain/poolbrain.service';

@Injectable()
export class OnboardingSyncService {
  constructor(
    private prisma: PrismaService,
    private poolbrain: PoolbrainService,
  ) {}

  @Cron('*/15 * * * *') // Every 15 minutes
  async syncToPoolbrain() {
    const unsyncedSessions = await this.prisma.onboardingSession.findMany({
      where: {
        status: 'COMPLETED',
        syncedToPoolbrain: false,
      },
      include: {
        customer: {
          include: {
            waterChemistry: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
            poolDetails: true,
          },
        },
      },
    });

    for (const session of unsyncedSessions) {
      try {
        // Sync pool details if available
        if (session.customer.poolDetails) {
          await this.poolbrain.updateCustomerPoolDetails(
            session.customer.poolbrainId,
            session.customer.poolDetails,
          );
        }

        // Sync water chemistry if available
        if (session.customer.waterChemistry[0]) {
          await this.poolbrain.createServiceRecord(
            session.customer.poolbrainId,
            session.customer.waterChemistry[0],
          );
        }

        // Mark as synced
        await this.prisma.onboardingSession.update({
          where: { id: session.id },
          data: {
            syncedToPoolbrain: true,
            syncedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`Failed to sync session ${session.id}:`, error);
      }
    }
  }
}
