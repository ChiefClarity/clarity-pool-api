import { Injectable, Logger } from '@nestjs/common';
import {
  ChemistryReadings,
  ChemistryTrend,
  EquipmentStatus,
  EnvironmentData,
  PoolHealthScore,
} from './interfaces/report.interface';

@Injectable()
export class HealthScoreCalculator {
  private readonly logger = new Logger(HealthScoreCalculator.name);

  // Ideal ranges for chemistry parameters
  private readonly idealRanges = {
    chlorine: { min: 1, max: 3, ideal: 2 },
    ph: { min: 7.2, max: 7.6, ideal: 7.4 },
    alkalinity: { min: 80, max: 120, ideal: 100 },
    calcium: { min: 200, max: 400, ideal: 300 },
    cyanuricAcid: { min: 30, max: 50, ideal: 40 },
    salt: { min: 2700, max: 3400, ideal: 3050 },
    tds: { min: 0, max: 1500, ideal: 750 },
    phosphates: { min: 0, max: 100, ideal: 0 },
    copper: { min: 0, max: 0.3, ideal: 0 },
    iron: { min: 0, max: 0.3, ideal: 0 },
  };

  calculateScore(data: {
    chemistry: ChemistryReadings;
    trends: ChemistryTrend[];
    equipment: EquipmentStatus;
    environment: EnvironmentData;
  }): PoolHealthScore {
    try {
      // Calculate component scores
      const chemistryScore = this.calculateChemistryScore(
        data.chemistry,
        data.trends,
      );
      const equipmentScore = this.calculateEquipmentScore(data.equipment);
      const environmentScore = this.calculateEnvironmentScore(data.environment);

      // Weight: Chemistry 50%, Equipment 30%, Environment 20%
      const overallScore = Math.round(
        chemistryScore * 0.5 + equipmentScore * 0.3 + environmentScore * 0.2,
      );

      // Generate details based on scores
      const details = this.generateHealthDetails(data, {
        chemistryScore,
        equipmentScore,
        environmentScore,
      });

      this.logger.log(`Calculated health score: ${overallScore}`, {
        chemistry: chemistryScore,
        equipment: equipmentScore,
        environment: environmentScore,
      });

      return {
        overall: overallScore,
        chemistry: chemistryScore,
        equipment: equipmentScore,
        environment: environmentScore,
        details,
      };
    } catch (error) {
      this.logger.error('Failed to calculate health score:', error);
      throw error;
    }
  }

  private calculateChemistryScore(
    chemistry: ChemistryReadings,
    trends: ChemistryTrend[],
  ): number {
    let score = 100;
    const criticalParams = ['chlorine', 'ph'];
    const importantParams = ['alkalinity', 'calcium', 'cyanuricAcid'];

    // Check critical parameters (higher penalty)
    for (const param of criticalParams) {
      const value = chemistry[param as keyof ChemistryReadings] as number;
      const range = this.idealRanges[param as keyof typeof this.idealRanges];

      if (value < range.min || value > range.max) {
        const deviation = this.calculateDeviation(value, range);
        score -= Math.min(deviation * 15, 30); // Max 30 point penalty per critical param
      }
    }

    // Check important parameters (moderate penalty)
    for (const param of importantParams) {
      const value = chemistry[param as keyof ChemistryReadings] as number;
      const range = this.idealRanges[param as keyof typeof this.idealRanges];

      if (value < range.min || value > range.max) {
        const deviation = this.calculateDeviation(value, range);
        score -= Math.min(deviation * 10, 20); // Max 20 point penalty per important param
      }
    }

    // Check optional parameters (lower penalty)
    const optionalParams = ['salt', 'tds', 'phosphates', 'copper', 'iron'];
    for (const param of optionalParams) {
      const value = chemistry[param as keyof ChemistryReadings];
      if (value !== undefined && value !== null) {
        const range = this.idealRanges[param as keyof typeof this.idealRanges];
        if (value < range.min || value > range.max) {
          const deviation = this.calculateDeviation(value, range);
          score -= Math.min(deviation * 5, 10); // Max 10 point penalty per optional param
        }
      }
    }

    // Apply trend penalties
    for (const trend of trends) {
      if (trend.trend === 'increasing' && trend.changePercent > 20) {
        score -= 5;
      } else if (trend.trend === 'decreasing' && trend.changePercent > 20) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateEquipmentScore(equipment: EquipmentStatus): number {
    let score = 100;

    // Pump scoring (40% of equipment score)
    switch (equipment.pump.status) {
      case 'operational':
        // No penalty
        break;
      case 'warning':
        score -= 15;
        break;
      case 'critical':
        score -= 40;
        break;
    }

    // Additional pump issue penalties
    score -= equipment.pump.issues.length * 5;

    // Filter scoring (40% of equipment score)
    switch (equipment.filter.status) {
      case 'operational':
        // Check pressure
        if (equipment.filter.pressure > 20) {
          score -= 10; // High pressure penalty
        } else if (equipment.filter.pressure < 10) {
          score -= 5; // Low pressure penalty
        }
        break;
      case 'warning':
        score -= 15;
        break;
      case 'critical':
        score -= 40;
        break;
    }

    // Heater scoring (10% of equipment score if present)
    if (equipment.heater) {
      switch (equipment.heater.status) {
        case 'warning':
          score -= 5;
          break;
        case 'critical':
          score -= 10;
          break;
      }
    }

    // Sanitizer scoring (10% of equipment score if present)
    if (equipment.sanitizer) {
      switch (equipment.sanitizer.status) {
        case 'warning':
          score -= 5;
          break;
        case 'critical':
          score -= 10;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateEnvironmentScore(environment: EnvironmentData): number {
    let score = 100;

    // Temperature impact
    if (environment.temperature > 95) {
      score -= 15; // High temp increases chemical consumption
    } else if (environment.temperature < 50) {
      score -= 10; // Low temp affects equipment efficiency
    }

    // Weather condition impact
    const adverseConditions = ['rain', 'storm', 'heavy rain', 'thunderstorm'];
    if (
      adverseConditions.some((condition) =>
        environment.conditions.toLowerCase().includes(condition),
      )
    ) {
      score -= 10;
    }

    // Forecast impact (upcoming weather)
    let rainyDays = 0;
    let extremeTempDays = 0;

    for (const day of environment.forecast) {
      if (day.precipitation > 50) {
        rainyDays++;
      }
      if (day.temp > 95 || day.temp < 50) {
        extremeTempDays++;
      }
    }

    score -= rainyDays * 5;
    score -= extremeTempDays * 3;

    return Math.max(0, Math.min(100, score));
  }

  private calculateDeviation(
    value: number,
    range: { min: number; max: number; ideal: number },
  ): number {
    if (value >= range.min && value <= range.max) {
      return 0;
    }

    if (value < range.min) {
      return ((range.min - value) / range.min) * 100;
    }

    return ((value - range.max) / range.max) * 100;
  }

  private generateHealthDetails(
    data: any,
    scores: {
      chemistryScore: number;
      equipmentScore: number;
      environmentScore: number;
    },
  ): {
    positives: string[];
    concerns: string[];
    recommendations: string[];
  } {
    const positives: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Chemistry analysis
    if (scores.chemistryScore >= 80) {
      positives.push('Water chemistry is well-balanced');
    }

    // Check specific chemistry issues
    if (data.chemistry.chlorine < this.idealRanges.chlorine.min) {
      concerns.push('Chlorine levels are too low');
      recommendations.push(
        'Add chlorine to reach 1-3 ppm for proper sanitization',
      );
    } else if (data.chemistry.chlorine > this.idealRanges.chlorine.max) {
      concerns.push('Chlorine levels are too high');
      recommendations.push('Allow chlorine to dissipate or add neutralizer');
    }

    if (data.chemistry.ph < this.idealRanges.ph.min) {
      concerns.push('pH is too low (acidic)');
      recommendations.push(
        'Add pH increaser (soda ash) to raise pH to 7.2-7.6',
      );
    } else if (data.chemistry.ph > this.idealRanges.ph.max) {
      concerns.push('pH is too high (basic)');
      recommendations.push(
        'Add pH decreaser (muriatic acid) to lower pH to 7.2-7.6',
      );
    }

    // Equipment analysis
    if (scores.equipmentScore >= 90) {
      positives.push('All equipment is functioning properly');
    }

    if (data.equipment.pump.status !== 'operational') {
      concerns.push(`Pump is in ${data.equipment.pump.status} condition`);
      recommendations.push('Schedule pump inspection and maintenance');
    }

    if (data.equipment.filter.pressure > 20) {
      concerns.push('Filter pressure is high');
      recommendations.push('Clean or backwash filter to reduce pressure');
    }

    // Environment analysis
    if (scores.environmentScore >= 80) {
      positives.push('Weather conditions are favorable for pool maintenance');
    }

    if (data.environment.temperature > 95) {
      concerns.push('High temperatures may increase chemical consumption');
      recommendations.push(
        'Monitor and adjust chemical levels more frequently',
      );
    }

    // Overall recommendations based on score
    if (data.overall < 60) {
      recommendations.push(
        'Consider scheduling an additional service visit this week',
      );
    }

    return {
      positives,
      concerns,
      recommendations,
    };
  }
}
