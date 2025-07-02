import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiVisionService {
  private readonly logger = new Logger(GeminiVisionService.name);
  private gemini: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (apiKey) {
      this.gemini = new GoogleGenerativeAI(apiKey);
    }
  }

  async analyzeEquipmentPhoto(photoUrl: string, photoBuffer?: Buffer) {
    if (!this.gemini) {
      throw new Error('Gemini API not configured');
    }

    try {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const prompt = `Analyze this pool equipment photo and identify:
      1. Equipment type (pump, filter, heater, salt system, cleaner, timer, valves, etc.)
      2. Brand/manufacturer name (if visible)
      3. Model number (if visible)
      4. Serial number (if visible)
      5. Condition assessment (excellent/good/fair/poor)
      6. Estimated age (0-2 years, 2-5 years, 5-10 years, 10+ years)
      7. Any visible issues or damage
      8. Maintenance recommendations
      9. Confidence score for each identification (0-100%)
      
      Return as JSON with this structure:
      {
        "equipmentType": "string",
        "brand": "string or null",
        "model": "string or null",
        "serialNumber": "string or null",
        "condition": "excellent|good|fair|poor",
        "estimatedAge": "string",
        "visibleIssues": ["array of issues"],
        "maintenanceRecommendations": ["array of recommendations"],
        "confidence": {
          "type": 95,
          "brand": 80,
          "model": 70,
          "overall": 85
        }
      }`;

      // Convert photo buffer to base64 if provided, otherwise fetch from URL
      let imageData: string;
      if (photoBuffer) {
        imageData = photoBuffer.toString('base64');
      } else {
        // In production, fetch from S3 URL
        const response = await fetch(photoUrl);
        const buffer = await response.arrayBuffer();
        imageData = Buffer.from(buffer).toString('base64');
      }

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        },
      ]);

      const response = result.response.text();
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Gemini Vision analysis failed', error);
      throw error;
    }
  }

  async analyzePoolFromSatellite(imageData: string) {
    if (!this.gemini) {
      throw new Error('Gemini API not configured');
    }

    try {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const prompt = `Analyze this satellite image of a residential property and identify pool-related features:
      1. Pool shape (rectangle, oval, kidney, freeform, etc.)
      2. Estimated pool dimensions (length x width in feet)
      3. Pool surface color/type if visible
      4. Deck/patio area and material
      5. Landscaping and trees near pool
      6. Tree types and proximity to pool
      7. Equipment pad location if visible
      8. Access points for service vehicles
      9. Any visible pool covers or features
      10. Potential service challenges
      
      Return as JSON.`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        },
      ]);

      return JSON.parse(result.response.text());
    } catch (error) {
      this.logger.error('Satellite analysis failed', error);
      throw error;
    }
  }
}
