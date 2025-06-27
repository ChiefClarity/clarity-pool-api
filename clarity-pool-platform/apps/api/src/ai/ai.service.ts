import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private anthropic: Anthropic;
  private googleMaps: GoogleMapsClient;

  constructor(
    private configService: ConfigService,
    private uploadsService: UploadsService
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const googleMapsKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');

    if (!geminiKey || !anthropicKey || !googleMapsKey) {
      this.logger.error('Missing AI API keys in environment variables');
      throw new Error('AI service configuration error: Missing API keys');
    }

    this.genAI = new GoogleGenerativeAI(geminiKey);
    this.anthropic = new Anthropic({ apiKey: anthropicKey });
    this.googleMaps = new GoogleMapsClient({});
  }

  async analyzeTestStrip(imageBase64: string, sessionId: string): Promise<any> {
    try {
      this.logger.log(`Analyzing test strip for session: ${sessionId}`);
      
      // Validate inputs
      if (!imageBase64) {
        throw new BadRequestException('Image data is required');
      }
      
      if (!sessionId) {
        throw new BadRequestException('Session ID is required');
      }
      
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      // Validate base64 data
      if (!base64Data || base64Data.length < 100) {
        throw new BadRequestException('Invalid image data');
      }
      
      // Upload to S3 first for permanent storage
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'water-chemistry',
        { sessionId, analysisType: 'test-strip' }
      );
      
      // Analyze with Gemini Vision
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `You are a pool water chemistry expert. Analyze this pool water test strip image and extract the chemical readings.
      
      Return the values in this exact JSON format:
      {
        "readings": {
          "freeChlorine": number or null,
          "totalChlorine": number or null,
          "ph": number or null,
          "alkalinity": number or null,
          "cyanuricAcid": number or null,
          "calcium": number or null,
          "copper": number or null,
          "iron": number or null,
          "phosphates": number or null,
          "salt": number or null,
          "tds": number or null
        },
        "confidence": number between 0-1
      }
      
      If you cannot detect a value, use null. Only return the JSON, no other text.`;
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        },
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      let analysisData;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        analysisData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        this.logger.error('Failed to parse Gemini response:', parseError);
        this.logger.error('Raw response:', text);
        throw new Error('Failed to parse AI response');
      }
      
      // Return standardized response
      return {
        success: true,
        data: {
          readings: analysisData.readings || {},
          imageUrl: uploadResult.url,
          analysis: {
            timestamp: new Date().toISOString(),
            aiModel: 'gemini-1.5-flash',
            confidence: analysisData.confidence || 0.8,
          },
        },
      };
    } catch (error) {
      this.logger.error('Test strip analysis failed:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Log the full error for debugging
      if (error.response) {
        this.logger.error('API Error Response:', error.response);
      }
      
      throw new Error(
        `Failed to analyze test strip: ${error.message || 'Unknown error'}`
      );
    }
  }

  async analyzePoolSatellite(address: string, sessionId: string): Promise<any> {
    try {
      this.logger.log(`Getting satellite view for address: ${address}`);
      
      // Geocode the address
      const geocodeResponse = await this.googleMaps.geocode({
        params: {
          address,
          key: this.configService.get<string>('GOOGLE_MAPS_API_KEY')!,
        },
      });

      if (!geocodeResponse.data.results.length) {
        throw new BadRequestException('Address not found');
      }

      const location = geocodeResponse.data.results[0].geometry.location;
      const formattedAddress = geocodeResponse.data.results[0].formatted_address;
      
      // Get static map with higher resolution
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=20&size=640x640&scale=2&maptype=satellite&key=${this.configService.get<string>('GOOGLE_MAPS_API_KEY')}`;

      // Fetch and upload satellite image
      const imageResponse = await fetch(staticMapUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'pool',
        { sessionId, analysisType: 'satellite', address: formattedAddress }
      );

      // Analyze with Gemini Vision
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze this satellite image of a residential property and identify pool-related features.
      
      Look for and describe:
      1. Pool presence and approximate dimensions
      2. Pool shape (rectangular, kidney, freeform, etc.)
      3. Pool color/condition (clear blue, green/algae, covered, empty)
      4. Deck material and condition
      5. Screen enclosure presence
      6. Equipment pad location
      7. Any water features (spa, waterfall, etc.)
      8. Surrounding landscape that might affect pool
      
      Provide a detailed JSON response with your findings.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
      ]);

      const response = await result.response;
      const analysisText = response.text();
      
      // Parse AI response
      let poolFeatures = {};
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          poolFeatures = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If not JSON, structure the text response
        poolFeatures = { description: analysisText };
      }

      return {
        success: true,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: formattedAddress,
        },
        satelliteImageUrl: uploadResult.url,
        analysis: {
          features: poolFeatures,
          timestamp: new Date().toISOString(),
          aiModel: 'gemini-1.5-flash',
        }
      };
    } catch (error) {
      this.logger.error('Pool satellite analysis failed:', error);
      throw new BadRequestException('Failed to analyze pool location');
    }
  }

  async analyzeEquipment(imageBase64: string, sessionId: string, equipmentType?: string): Promise<any> {
    try {
      this.logger.log(`Analyzing equipment for session: ${sessionId}`);
      
      // Remove data URL prefix
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      // Upload to S3
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'equipment',
        { sessionId, analysisType: 'equipment', equipmentType: equipmentType || 'unknown' }
      );
      
      // Analyze with Gemini Vision
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `You are a pool equipment expert. Analyze this pool equipment image.
      ${equipmentType ? `The user indicates this is a ${equipmentType}.` : ''}
      
      Identify and provide detailed information about:
      1. Equipment type (pump, filter, heater, chlorinator, automation, etc.)
      2. Brand/manufacturer (look for logos, labels)
      3. Model number (check data plates, stickers)
      4. Estimated age (based on condition, style)
      5. Condition assessment (excellent, good, fair, poor)
      6. Visible issues:
         - Rust or corrosion
         - Leaks or moisture
         - Cracks or damage
         - Missing parts
         - Electrical issues
      7. Maintenance recommendations
      8. Estimated replacement cost range
      
      Return a detailed JSON object with all findings.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Parse response
      let analysis = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        analysis = { 
          description: text,
          type: equipmentType || 'unknown',
          condition: 'requires inspection'
        };
      }

      return {
        success: true,
        imageUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        analysis: {
          ...analysis,
          timestamp: new Date().toISOString(),
          aiModel: 'gemini-1.5-flash',
        }
      };
    } catch (error) {
      this.logger.error('Equipment analysis failed:', error);
      throw new BadRequestException('Failed to analyze equipment');
    }
  }

  async generateWaterChemistryInsights(readings: any, sessionId: string): Promise<any> {
    try {
      this.logger.log(`Generating water chemistry insights for session: ${sessionId}`);
      
      const message = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `As an expert pool water chemistry analyst, analyze these test results and provide comprehensive insights:

Test Results:
${JSON.stringify(readings, null, 2)}

Provide a detailed analysis including:

1. **Overall Water Quality Score** (0-100)
2. **Immediate Safety Concerns** (if any)
3. **Chemical Balance Assessment**
4. **Required Adjustments** with specific chemical amounts for a typical 15,000 gallon pool
5. **Step-by-Step Treatment Instructions**
6. **Safety Warnings**
7. **Follow-up Testing Schedule**

Format your response as a JSON object with these sections:
{
  "overallScore": number,
  "status": "safe" | "caution" | "unsafe",
  "immediateConcerns": [],
  "balanceAssessment": {},
  "requiredAdjustments": [],
  "treatmentInstructions": [],
  "safetyWarnings": [],
  "followUpSchedule": {},
  "summary": "brief overall summary"
}`
        }]
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      
      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI insights');
      }

      const insights = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        insights,
        metadata: {
          timestamp: new Date().toISOString(),
          aiModel: 'claude-3-sonnet',
          readingsAnalyzed: Object.keys(readings).filter(k => readings[k] !== null).length,
        }
      };
    } catch (error) {
      this.logger.error('Water chemistry insights generation failed:', error);
      throw new BadRequestException('Failed to generate insights');
    }
  }

  async transcribeVoiceNote(audioBase64: string, sessionId: string): Promise<any> {
    try {
      this.logger.log(`Transcribing voice note for session: ${sessionId}`);
      
      // For now, we'll use a placeholder implementation
      // In production, integrate with Google Speech-to-Text or OpenAI Whisper
      
      // Remove data URL prefix
      const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      
      // Save audio file to S3 (implement audio upload in uploads service)
      // const audioBuffer = Buffer.from(base64Data, 'base64');
      
      // Placeholder response
      return {
        success: true,
        transcription: 'Voice transcription will be implemented with Google Speech-to-Text API',
        summary: 'Audio note recorded',
        duration: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          sessionId,
          aiModel: 'pending-integration',
        }
      };
    } catch (error) {
      this.logger.error('Voice transcription failed:', error);
      throw new BadRequestException('Failed to transcribe voice note');
    }
  }

  async analyzePoolSurface(imageBase64: string, sessionId: string): Promise<any> {
    try {
      this.logger.log(`Analyzing pool surface for session: ${sessionId}`);
      
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Upload to S3
      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'pool',
        { sessionId, analysisType: 'pool-surface' }
      );
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze this pool surface image as an expert pool inspector.
      
      Identify:
      1. Surface Material Type:
         - Plaster (white, colored, or aggregate)
         - Pebble (exposed aggregate finish)
         - Tile (ceramic or glass)
         - Vinyl liner
         - Fiberglass
         - Other/Unknown
      
      2. Surface Condition:
         - Excellent: Like new, no visible wear
         - Good: Minor wear, no damage
         - Fair: Moderate wear, minor damage
         - Poor: Significant wear, needs resurfacing
      
      3. Visible Issues:
         - Stains (type and severity)
         - Cracks or chips
         - Rough patches
         - Delamination
         - Discoloration
         - Scale buildup
      
      4. Maintenance Recommendations
      
      Return a detailed JSON analysis.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
      ]);

      const response = await result.response;
      const text = response.text();
      
      let analysis = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        analysis = { description: text };
      }

      return {
        success: true,
        imageUrl: uploadResult.url,
        analysis: {
          ...analysis,
          timestamp: new Date().toISOString(),
          aiModel: 'gemini-1.5-flash',
        }
      };
    } catch (error) {
      this.logger.error('Pool surface analysis failed:', error);
      throw new BadRequestException('Failed to analyze pool surface');
    }
  }

  async analyzePoolEnvironment(images: string[], sessionId: string): Promise<any> {
    try {
      this.logger.log(`Analyzing pool environment for session: ${sessionId}`);
      
      const analysisResults = [];
      const uploadedImages = [];
      
      // Process each environment image
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const uploadResult = await this.uploadsService.uploadImage(
          imageBuffer,
          'image/jpeg',
          'pool',
          { sessionId, analysisType: 'environment', imageIndex: i.toString() }
        );
        
        uploadedImages.push(uploadResult.url);
      }
      
      // Analyze all images together for comprehensive environment assessment
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze these pool environment images as a pool maintenance expert.
      
      Identify and assess:
      
      1. Nearby Vegetation:
         - Trees (type, distance from pool, overhang)
         - Bushes/shrubs
         - Grass areas
         - Risk of debris falling into pool
      
      2. Ground Conditions:
         - Grass vs dirt/mulch areas
         - Drainage patterns
         - Erosion risks
         - Sprinkler system presence
      
      3. Environmental Factors:
         - Sun exposure (full sun, partial shade, heavy shade)
         - Wind exposure
         - Privacy/screening
         - Neighboring structures
      
      4. Maintenance Challenges:
         - Leaf/debris load expectations
         - Chemical balance impacts
         - Algae growth risk factors
         - Equipment placement issues
      
      5. Recommendations:
         - Trimming needs
         - Drainage improvements
         - Chemical adjustment frequency
         - Equipment protection
      
      Provide a comprehensive JSON analysis of the pool environment.`;

      const imagesForAnalysis = images.slice(0, 3).map((img, idx) => ({
        inlineData: { 
          data: img.replace(/^data:image\/\w+;base64,/, ''), 
          mimeType: 'image/jpeg' 
        }
      }));

      const result = await model.generateContent([prompt, ...imagesForAnalysis]);
      const response = await result.response;
      const text = response.text();
      
      let analysis = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        analysis = { description: text };
      }

      return {
        success: true,
        imageUrls: uploadedImages,
        analysis: {
          ...analysis,
          imagesAnalyzed: images.length,
          timestamp: new Date().toISOString(),
          aiModel: 'gemini-1.5-flash',
        }
      };
    } catch (error) {
      this.logger.error('Environment analysis failed:', error);
      throw new BadRequestException('Failed to analyze pool environment');
    }
  }

  async analyzeSkimmers(images: string[], sessionId: string): Promise<any> {
    try {
      this.logger.log(`Analyzing skimmers for session: ${sessionId}`);
      
      const uploadedImages = [];
      
      // Upload all skimmer images
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const uploadResult = await this.uploadsService.uploadImage(
          imageBuffer,
          'image/jpeg',
          'equipment',
          { sessionId, analysisType: 'skimmer', imageIndex: i.toString() }
        );
        
        uploadedImages.push(uploadResult.url);
      }
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze these pool skimmer images as a pool equipment expert.
      
      Count and assess:
      
      1. Skimmer Count:
         - How many unique skimmers are shown?
         - Are some images of the same skimmer?
      
      2. For Each Skimmer:
         - Basket condition (clean, dirty, damaged, missing)
         - Lid/cover condition (intact, cracked, missing)
         - Weir door/flap condition
         - Overall skimmer housing condition
         - Any visible cracks or damage
      
      3. Maintenance Issues:
         - Debris accumulation
         - Need for basket replacement
         - Lid replacement needs
         - Cleaning requirements
      
      4. Type Identification:
         - In-ground skimmer
         - Above-ground skimmer
         - Brand if visible
      
      Return a JSON object with:
      - detectedSkimmerCount: number
      - skimmers: array of individual skimmer assessments
      - overallCondition: excellent/good/fair/poor
      - recommendations: array of maintenance items`;

      const imagesForAnalysis = images.slice(0, 6).map((img) => ({
        inlineData: { 
          data: img.replace(/^data:image\/\w+;base64,/, ''), 
          mimeType: 'image/jpeg' 
        }
      }));

      const result = await model.generateContent([prompt, ...imagesForAnalysis]);
      const response = await result.response;
      const text = response.text();
      
      let analysis = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        analysis = { 
          detectedSkimmerCount: 1,
          description: text 
        };
      }

      return {
        success: true,
        imageUrls: uploadedImages,
        analysis: {
          ...analysis,
          imagesAnalyzed: images.length,
          timestamp: new Date().toISOString(),
          aiModel: 'gemini-1.5-flash',
        }
      };
    } catch (error) {
      this.logger.error('Skimmer analysis failed:', error);
      throw new BadRequestException('Failed to analyze skimmers');
    }
  }

  async analyzeDeck(images: string[], sessionId: string): Promise<any> {
    try {
      this.logger.log(`Analyzing pool deck for session: ${sessionId}`);
      
      const uploadedImages = [];
      
      // Upload deck images
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const uploadResult = await this.uploadsService.uploadImage(
          imageBuffer,
          'image/jpeg',
          'pool',
          { sessionId, analysisType: 'deck', imageIndex: i.toString() }
        );
        
        uploadedImages.push(uploadResult.url);
      }
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze these pool deck images as a hardscape expert.
      
      Identify:
      
      1. Deck Material:
         - Pavers (concrete, brick, stone)
         - Stamped concrete
         - Regular concrete
         - Natural stone
         - Tile
         - Wood decking
         - Composite decking
      
      2. Deck Condition:
         - Surface cleanliness (clean, dirty, stained)
         - Structural integrity
         - Cracks or damage
         - Settlement or unevenness
         - Slip hazards
      
      3. Maintenance Issues:
         - Pressure washing needs
         - Sealing requirements
         - Repair priorities
         - Safety concerns
      
      4. Features:
         - Coping condition
         - Expansion joints
         - Drainage
         - Trip hazards
      
      Return a comprehensive JSON analysis with material type, condition assessment, and recommendations.`;

      const imagesForAnalysis = images.slice(0, 4).map((img) => ({
        inlineData: { 
          data: img.replace(/^data:image\/\w+;base64,/, ''), 
          mimeType: 'image/jpeg' 
        }
      }));

      const result = await model.generateContent([prompt, ...imagesForAnalysis]);
      const response = await result.response;
      const text = response.text();
      
      let analysis = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        analysis = { description: text };
      }

      return {
        success: true,
        imageUrls: uploadedImages,
        analysis: {
          ...analysis,
          imagesAnalyzed: images.length,
          timestamp: new Date().toISOString(),
          aiModel: 'gemini-1.5-flash',
        }
      };
    } catch (error) {
      this.logger.error('Deck analysis failed:', error);
      throw new BadRequestException('Failed to analyze deck');
    }
  }

  // Helper methods
  private validateWaterChemistry(readings: any): any {
    const ranges: Record<string, { min: number; max: number }> = {
      freeChlorine: { min: 0, max: 10 },
      totalChlorine: { min: 0, max: 10 },
      ph: { min: 6.8, max: 8.2 },
      alkalinity: { min: 60, max: 180 },
      cyanuricAcid: { min: 0, max: 100 },
      calcium: { min: 150, max: 500 },
      copper: { min: 0, max: 0.5 },
      iron: { min: 0, max: 0.5 },
      phosphates: { min: 0, max: 2000 },
      salt: { min: 0, max: 6000 },
      tds: { min: 0, max: 3000 },
    };

    const validated = { ...readings };
    
    for (const [key, value] of Object.entries(readings)) {
      if (value !== null && value !== undefined && ranges[key]) {
        const { min, max } = ranges[key];
        const numValue = Number(value);
        if (numValue < min || numValue > max) {
          this.logger.warn(`${key} value ${numValue} outside normal range [${min}-${max}]`);
          // Clamp to range but flag as suspicious
          validated[key] = Math.max(min, Math.min(max, numValue));
        }
      }
    }

    return validated;
  }

  private calculateConfidence(readings: any): number {
    const nonNullValues = Object.values(readings).filter(v => v !== null).length;
    const totalFields = Object.keys(readings).length;
    return Math.round((nonNullValues / totalFields) * 100);
  }
}