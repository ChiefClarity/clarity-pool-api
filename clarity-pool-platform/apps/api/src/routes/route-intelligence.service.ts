import { Injectable, Logger, Inject } from '@nestjs/common';
import { PoolbrainService } from '../poolbrain/poolbrain.service';
import * as Sentry from '@sentry/node';
import { TechnicianScore, TechnicianData } from './interfaces/route.interfaces';

export interface RouteRecommendation {
  technicianId: string;
  technicianName: string;
  routeDay?: string;
  distanceToRoute: number;
  routeStopCount: number;
  capacityAvailable: number;
  score: number;
  factors: TechnicianScore['factors'];
}

@Injectable()
export class RouteIntelligenceService {
  private readonly logger = new Logger(RouteIntelligenceService.name);

  constructor(
    private poolbrain: PoolbrainService,
    @Inject('CACHE_MANAGER') private cache: any,
  ) {}

  async getRecommendations(bookingId: string, booking: any): Promise<RouteRecommendation[]> {
    return Sentry.startSpan(
      { name: 'RouteIntelligence.getRecommendations' },
      async () => {
        try {
          const cacheKey = `recommendations:${bookingId}`;
          const cached = await this.cache.get(cacheKey) as RouteRecommendation[] | undefined;
          
          if (cached) {
            return cached;
          }

          const technicians = await this.poolbrain.getTechniciansWithRoutes() || [];
          
          const recommendations = await Promise.all(
            technicians.map(async (tech: any) => {
              const score = await this.calculateTechnicianScore(tech, booking);
              return {
                technicianId: tech.id,
                technicianName: tech.name,
                score: score.total,
                factors: score.factors,
                routeDay: tech.primaryRoute?.dayOfWeek,
                distanceToRoute: score.factors.proximity,
                routeStopCount: tech.primaryRoute?.stops?.length || 0,
                capacityAvailable: tech.maxCapacity - tech.currentCapacity,
              };
            })
          );

          const sorted = recommendations.sort((a, b) => b.score - a.score);
          
          await this.cache.set(cacheKey, sorted, 300);
          
          return sorted;
        } catch (error) {
          this.logger.error('Failed to get recommendations', error);
          return [];
        }
      }
    );
  }

  async analyzeRouteOptions(data: { address: string; preferredDays: string[] }) {
    return Sentry.startSpan(
      { name: 'RouteIntelligence.analyzeRouteOptions' },
      async () => {
        try {
          // Get all technicians
          const technicians = await this.poolbrain.getTechniciansWithRoutes();
          
          // Analyze each day
          const analysis = await Promise.all(
            data.preferredDays.map(async (day) => {
              // Find technicians working on this day
              const dayTechs = technicians.filter(
                (tech: any) => tech.primaryRoute?.dayOfWeek?.toLowerCase() === day.toLowerCase()
              );
              
              // Calculate average metrics for the day
              const distances = await Promise.all(
                dayTechs.map((tech: any) => 
                  this.calculateDistance(data.address, tech.primaryRoute?.stops || [])
                )
              );
              
              const avgDistance = distances.length > 0
                ? distances.reduce((sum, d) => sum + d, 0) / distances.length
                : 0;
              
              const totalCapacity = dayTechs.reduce(
                (sum: number, tech: any) => sum + (tech.maxCapacity - tech.currentCapacity), 
                0
              );
              
              return {
                day,
                technicianCount: dayTechs.length,
                averageDistance: avgDistance,
                totalAvailableCapacity: totalCapacity,
                recommendation: this.getDayRecommendation(avgDistance, totalCapacity, dayTechs.length),
              };
            })
          );
          
          // Sort by recommendation score
          const sorted = analysis.sort((a, b) => {
            const scoreA = this.calculateDayScore(a);
            const scoreB = this.calculateDayScore(b);
            return scoreB - scoreA;
          });
          
          return {
            recommendedDay: sorted[0]?.day || null,
            analysis: sorted,
            metadata: {
              addressAnalyzed: data.address,
              technicianCount: technicians.length,
              timestamp: new Date().toISOString(),
            },
          };
        } catch (error) {
          this.logger.error('Failed to analyze route options', error);
          throw error;
        }
      }
    );
  }

  private async calculateTechnicianScore(technician: TechnicianData, booking: any): Promise<TechnicianScore> {
    // Complex scoring algorithm
    const factors = {
      proximity: 0,
      capacity: 0,
      preferredDay: 0,
      experience: 0,
      specialRequirements: 0,
    };

    // Calculate proximity score (0-100)
    const distance = await this.calculateDistance(
      booking.address,
      technician.primaryRoute?.stops || [],
    );
    factors.proximity = Math.max(0, 100 - distance * 2);

    // Calculate capacity score (0-100)
    const capacityPercent = technician.maxCapacity > 0
      ? (technician.currentCapacity / technician.maxCapacity) * 100
      : 100;
    factors.capacity = Math.max(0, 100 - capacityPercent);

    // Preferred day match (0 or 50)
    if (booking.preferredDays?.includes(technician.primaryRoute?.dayOfWeek)) {
      factors.preferredDay = 50;
    }

    // Experience with similar pools (0-30)
    factors.experience = Math.min(30, (technician.completedJobs || 0) * 0.1);

    // Special requirements (dogs, equipment expertise)
    if (booking.hasDogs && technician.comfortableWithDogs) {
      factors.specialRequirements += 20;
    }

    if (booking.requiresSpecialEquipment && technician.specialEquipmentCertified) {
      factors.specialRequirements += 15;
    }

    const total = Object.values(factors).reduce((sum, val) => sum + val, 0);

    return {
      total,
      factors,
      distance,
    };
  }

  private async calculateDistance(address: string, routeStops: any[]): Promise<number> {
    // In production, use Google Maps API
    // For now, mock calculation based on address similarity
    try {
      // Extract zip code from address for basic proximity
      const zipMatch = address.match(/\b\d{5}\b/);
      const addressZip = zipMatch ? zipMatch[0] : '';
      
      if (!addressZip || routeStops.length === 0) {
        return 10; // Default distance if no data
      }
      
      // Calculate average distance based on zip code proximity
      const distances = routeStops.map(stop => {
        const stopZipMatch = stop.address?.match(/\b\d{5}\b/);
        const stopZip = stopZipMatch ? stopZipMatch[0] : '';
        
        if (addressZip === stopZip) return 0.5; // Same zip code
        if (Math.abs(parseInt(addressZip) - parseInt(stopZip)) < 10) return 2; // Nearby zip
        if (Math.abs(parseInt(addressZip) - parseInt(stopZip)) < 100) return 5; // Same region
        return 10; // Far away
      });
      
      return distances.length > 0
        ? distances.reduce((sum, d) => sum + d, 0) / distances.length
        : 10;
    } catch (error) {
      this.logger.error('Error calculating distance:', error);
      return 10; // Default distance on error
    }
  }

  private getDayRecommendation(avgDistance: number, capacity: number, techCount: number): string {
    if (techCount === 0) return 'No technicians available';
    if (capacity === 0) return 'No capacity available';
    if (avgDistance < 2 && capacity > 5) return 'Excellent';
    if (avgDistance < 5 && capacity > 3) return 'Good';
    if (avgDistance < 8 && capacity > 1) return 'Fair';
    return 'Limited availability';
  }

  private calculateDayScore(dayAnalysis: any): number {
    let score = 0;
    
    // More technicians = better
    score += dayAnalysis.technicianCount * 10;
    
    // Lower distance = better
    score += Math.max(0, 100 - dayAnalysis.averageDistance * 10);
    
    // More capacity = better
    score += dayAnalysis.totalAvailableCapacity * 5;
    
    return score;
  }
}