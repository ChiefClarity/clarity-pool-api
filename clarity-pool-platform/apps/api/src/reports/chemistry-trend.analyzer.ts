import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChemistryReadings,
  ChemistryTrend,
} from './interfaces/report.interface';

@Injectable()
export class ChemistryTrendAnalyzer {
  private readonly logger = new Logger(ChemistryTrendAnalyzer.name);

  constructor(private prisma: PrismaService) {}

  async analyzeTrends(
    customerId: number,
    currentReadings: ChemistryReadings,
  ): Promise<ChemistryTrend[]> {
    try {
      // Get previous chemistry readings (last 4 weeks)
      const previousReadings = await this.getPreviousReadings(customerId);

      if (!previousReadings || previousReadings.length === 0) {
        this.logger.log('No previous readings found for trend analysis');
        return [];
      }

      // Calculate trends for each parameter
      const trends: ChemistryTrend[] = [];
      const parameters: (keyof ChemistryReadings)[] = [
        'chlorine',
        'ph',
        'alkalinity',
        'calcium',
        'cyanuricAcid',
      ];

      // Add optional parameters if present
      if (currentReadings.salt !== undefined) parameters.push('salt');
      if (currentReadings.tds !== undefined) parameters.push('tds');
      if (currentReadings.phosphates !== undefined)
        parameters.push('phosphates');

      for (const param of parameters) {
        const trend = this.calculateTrend(
          param,
          currentReadings[param] as number,
          previousReadings,
        );
        if (trend) {
          trends.push(trend);
        }
      }

      return trends;
    } catch (error) {
      this.logger.error('Failed to analyze chemistry trends:', error);
      return [];
    }
  }

  private async getPreviousReadings(customerId: number): Promise<any[]> {
    try {
      // For now, return mock data until schema is updated
      return this.getMockPreviousReadings();

      // TODO: Implement after schema migration
      // const readings = await this.prisma.$queryRaw`
      //   SELECT
      //     cr.*,
      //     sr.serviceDate
      //   FROM ChemistryReading cr
      //   JOIN ServiceRecord sr ON cr.serviceRecordId = sr.id
      //   WHERE sr.customerId = ${customerId}
      //   AND sr.serviceDate > DATE_SUB(NOW(), INTERVAL 4 WEEK)
      //   ORDER BY sr.serviceDate DESC
      //   LIMIT 4
      // `;
      // return readings as any[];
    } catch (error) {
      this.logger.error('Failed to fetch previous readings:', error);

      // Return mock data for development
      if (process.env.NODE_ENV === 'development') {
        return this.getMockPreviousReadings();
      }

      return [];
    }
  }

  private calculateTrend(
    parameter: keyof ChemistryReadings,
    currentValue: number,
    previousReadings: any[],
  ): ChemistryTrend | null {
    if (previousReadings.length === 0) {
      return null;
    }

    // Get the most recent previous value
    const previousValue = previousReadings[0][parameter];
    if (previousValue === undefined || previousValue === null) {
      return null;
    }

    // Calculate change
    const change = currentValue - previousValue;
    const changePercent =
      previousValue !== 0 ? (change / previousValue) * 100 : 0;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Check if in range (you'll need to define ideal ranges)
    const isInRange = this.isParameterInRange(parameter, currentValue);

    return {
      parameter,
      current: currentValue,
      previous: previousValue,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      trend,
      isInRange,
    };
  }

  private isParameterInRange(
    parameter: keyof ChemistryReadings,
    value: number,
  ): boolean {
    const ranges = {
      chlorine: { min: 1, max: 3 },
      ph: { min: 7.2, max: 7.6 },
      alkalinity: { min: 80, max: 120 },
      calcium: { min: 200, max: 400 },
      cyanuricAcid: { min: 30, max: 50 },
      salt: { min: 2700, max: 3400 },
      tds: { min: 0, max: 1500 },
      phosphates: { min: 0, max: 100 },
      copper: { min: 0, max: 0.3 },
      iron: { min: 0, max: 0.3 },
    };

    const range = ranges[parameter];
    if (!range) return true;

    return value >= range.min && value <= range.max;
  }

  private getMockPreviousReadings(): any[] {
    const now = new Date();
    const readings = [];

    for (let i = 1; i <= 4; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7); // Weekly readings

      readings.push({
        chlorine: 2.0 + (Math.random() - 0.5),
        ph: 7.4 + (Math.random() - 0.5) * 0.4,
        alkalinity: 100 + (Math.random() - 0.5) * 20,
        calcium: 300 + (Math.random() - 0.5) * 50,
        cyanuricAcid: 40 + (Math.random() - 0.5) * 10,
        salt: 3000 + (Math.random() - 0.5) * 200,
        serviceDate: date,
      });
    }

    return readings;
  }
}
