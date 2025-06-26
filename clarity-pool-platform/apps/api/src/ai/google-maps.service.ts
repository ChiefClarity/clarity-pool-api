import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private googleMaps: GoogleMapsClient;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.googleMaps = new GoogleMapsClient({});
    this.apiKey = this.configService.get('GOOGLE_MAPS_API_KEY') || '';
  }

  async getPoolSatelliteView(address: string) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      // First, geocode the address
      const geocodeResult = await this.googleMaps.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (!geocodeResult.data.results.length) {
        throw new Error('Address not found');
      }

      const location = geocodeResult.data.results[0].geometry.location;

      // Generate satellite image URL
      const satelliteUrl = this.generateSatelliteUrl(location.lat, location.lng);

      // Fetch the satellite image
      const imageResponse = await fetch(satelliteUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      return {
        location,
        satelliteUrl,
        imageData: imageBase64,
        address: geocodeResult.data.results[0].formatted_address,
      };
    } catch (error) {
      this.logger.error('Google Maps satellite fetch failed', error);
      throw error;
    }
  }

  private generateSatelliteUrl(lat: number, lng: number): string {
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '20', // Max zoom for best detail
      size: '640x640',
      maptype: 'satellite',
      key: this.apiKey,
    });

    return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
  }

  async getDirections(technicianLocation: { lat: number; lng: number }, customerAddress: string) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const directionsResult = await this.googleMaps.directions({
        params: {
          origin: `${technicianLocation.lat},${technicianLocation.lng}`,
          destination: customerAddress,
          key: this.apiKey,
          mode: 'driving' as any,
        },
      });

      if (!directionsResult.data.routes.length) {
        throw new Error('No route found');
      }

      const route = directionsResult.data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance,
        duration: leg.duration,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions,
          distance: step.distance,
          duration: step.duration,
        })),
      };
    } catch (error) {
      this.logger.error('Google Maps directions failed', error);
      throw error;
    }
  }

  async getPropertyInsights(address: string) {
    // This would integrate with additional Google APIs or property data services
    // For now, return mock data
    return {
      propertySize: 'estimated',
      poolVisible: true,
      treeCount: 'moderate',
      accessibilityScore: 8,
    };
  }
}