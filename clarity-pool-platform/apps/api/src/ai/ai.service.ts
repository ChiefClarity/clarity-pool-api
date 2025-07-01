import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GoogleGenerativeAIError } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import { UploadsService } from '../uploads/uploads.service';
import { GoogleCloudAuthService, GoogleAuthMethod } from '../common/google-cloud-auth.service';
import { InitializationStateService } from '../common/initialization-state.service';
import { SatelliteAnalysisParser } from './parsers/satellite-analysis.parser';
import { SurfaceAnalysisParser } from './parsers/surface-analysis.parser';
import { EnvironmentAnalysisParser } from './parsers/environment-analysis.parser';
import { SkimmerAnalysisParser } from './parsers/skimmer-analysis.parser';
import { DeckAnalysisParser } from './parsers/deck-analysis.parser';
import { SurfaceAnalysisPrompt } from './prompts/surface-analysis.prompt';

interface AIProvider {
  name: string;
  analyze: (imageUrl: string, prompt: string) => Promise<any>;
  available: boolean;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private readonly serviceName = 'AiService';
  private genAI: GoogleGenerativeAI | null = null;
  private anthropic: Anthropic | null = null;
  private googleMaps: GoogleMapsClient;
  private aiProviders: AIProvider[] = [];
  private waterChemistryProviders: AIProvider[] = [];
  private generalAIProviders: AIProvider[] = [];

  constructor(
    private configService: ConfigService,
    private uploadsService: UploadsService,
    private googleCloudAuth: GoogleCloudAuthService,
    private initState: InitializationStateService,
    private readonly satelliteParser: SatelliteAnalysisParser,
    private readonly surfaceParser: SurfaceAnalysisParser,
    private readonly environmentParser: EnvironmentAnalysisParser,
    private readonly skimmerParser: SkimmerAnalysisParser,
    private readonly deckParser: DeckAnalysisParser,
  ) {
    this.googleMaps = new GoogleMapsClient({});
    // Register this service
    this.initState.registerService(this.serviceName);
  }

  async onModuleInit() {
    this.initState.setServiceInitializing(this.serviceName);
    
    try {
      // Wait for GoogleCloudAuthService to be ready first
      this.logger.log('Waiting for GoogleCloudAuthService to initialize...');
      await this.initState.waitForService('GoogleCloudAuthService', 5000);
      this.logger.log('GoogleCloudAuthService is ready!');
      
      // Now initialize AI providers
      await this.initializeAIProviders();
      
      this.initState.setServiceReady(this.serviceName);
    } catch (error) {
      this.logger.error('Failed to initialize AiService:', error);
      this.initState.setServiceError(this.serviceName, error.message);
      throw error;
    }
  }

  private async initializeAIProviders() {
    // Initialize water chemistry providers (use parsing)
    this.waterChemistryProviders = [];
    
    // Initialize general AI providers (return raw response)
    this.generalAIProviders = [];
    
    // Initialize Gemini
    try {
      // THIS IS THE FIX - Get the API key from googleCloudAuth service
      const apiKey = this.googleCloudAuth.getApiKey();
      this.logger.log(`Getting API key from GoogleCloudAuthService...`);
      this.logger.log(`Gemini API key exists: ${!!apiKey}`);
      this.logger.log(`Gemini API key length: ${apiKey?.length || 0}`);
      
      if (apiKey) {
        this.logger.log('Attempting to initialize Gemini...');
        this.genAI = new GoogleGenerativeAI(apiKey);
        
        // Test if it actually initialized
        if (this.genAI) {
          this.logger.log('✅ Gemini GoogleGenerativeAI object created');
          
          this.waterChemistryProviders.push({
            name: 'Gemini',
            available: true,
            analyze: this.analyzeWithGemini.bind(this)
          });
          
          this.generalAIProviders.push({
            name: 'Gemini',
            available: true,
            analyze: this.analyzeWithGeminiRaw.bind(this)
          });
          
          this.logger.log('✅ Gemini AI provider added to both provider lists');
        } else {
          this.logger.error('❌ Gemini GoogleGenerativeAI object is null after initialization');
        }
      } else {
        const authMethod = this.googleCloudAuth.getAuthMethod();
        this.logger.log(`Auth method being used: ${authMethod}`);
        
        if (this.googleCloudAuth.isUsingSecureAuth()) {
          this.logger.warn('⚠️  Gemini SDK does not support service account auth yet - using fallback');
        } else {
          this.logger.warn('No Gemini API key found');
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Gemini:', error);
      this.logger.error('Error details:', error.message);
    }

    // Initialize Anthropic as fallback
    try {
      const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
      this.logger.log(`Anthropic API key exists: ${!!anthropicKey}`);
      if (anthropicKey) {
        this.anthropic = new Anthropic({ apiKey: anthropicKey });
        
        this.waterChemistryProviders.push({
          name: 'Claude',
          available: true,
          analyze: this.analyzeWithClaude.bind(this)
        });
        
        this.generalAIProviders.push({
          name: 'Claude',
          available: true,
          analyze: this.analyzeWithClaudeRaw.bind(this)
        });
        
        this.logger.log('✅ Claude AI initialized for both provider lists');
      } else {
        this.logger.log('No Anthropic API key found');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Claude', error);
    }

    // Keep the original for backward compatibility
    this.aiProviders = this.generalAIProviders;

    if (this.waterChemistryProviders.length === 0 && this.generalAIProviders.length === 0) {
      throw new Error('No AI providers available - check API configuration');
    }

    // Log the providers array
    this.logger.log(`Water Chemistry Providers: ${this.waterChemistryProviders.map(p => p.name).join(', ')}`);
    this.logger.log(`General AI Providers: ${this.generalAIProviders.map(p => p.name).join(', ')}`);
    this.logger.log(`Total providers: ${this.waterChemistryProviders.length} chemistry, ${this.generalAIProviders.length} general`);
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
      
      this.logger.log(`Image data length: ${base64Data.length} characters`);
      
      // Upload to S3 first for permanent storage
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'water-chemistry',
        { sessionId, analysisType: 'test-strip' }
      );
      
      this.logger.log(`S3 upload successful: ${uploadResult.url}`);

      // Log available providers
      this.logger.log(`Available AI providers: ${this.waterChemistryProviders.filter(p => p.available).map(p => p.name).join(', ')}`);
      this.logger.log(`All providers with status: ${JSON.stringify(this.waterChemistryProviders.map(p => ({ name: p.name, available: p.available })))}`);

      // Try each AI provider in order
      let lastError: Error | null = null;
      
      for (let i = 0; i < this.waterChemistryProviders.length; i++) {
        const provider = this.waterChemistryProviders[i];
        this.logger.log(`Provider ${i}: ${provider.name}, available: ${provider.available}`);
        
        if (!provider.available) {
          this.logger.log(`Skipping ${provider.name} - marked as unavailable`);
          continue;
        }
        
        try {
          this.logger.log(`Attempting analysis with ${provider.name}...`);
          this.logger.log(`Provider analyze function exists: ${!!provider.analyze}`);
          
          const result = await provider.analyze(
            uploadResult.url,
            this.getTestStripPrompt()
          );
          
          this.logger.log(`${provider.name} analysis successful!`);
          
          // If successful, return the result
          return {
            success: true,
            data: {
              ...result,
              imageUrl: uploadResult.url,
              thumbnailUrl: uploadResult.thumbnailUrl,
              analyzedBy: provider.name,
              sessionId
            }
          };
        } catch (error) {
          this.logger.error(`${provider.name} analysis failed:`, error);
          this.logger.error(`Error type: ${error.constructor.name}`);
          this.logger.error(`Error message: ${error.message}`);
          lastError = error;
          
          // Mark provider as temporarily unavailable if it's a rate limit or auth error
          if (error.status === 403 || error.status === 429) {
            provider.available = false;
            this.logger.warn(`Marking ${provider.name} as temporarily unavailable due to ${error.status} error`);
            setTimeout(() => {
              provider.available = true;
              this.logger.log(`${provider.name} re-enabled after cooldown`);
            }, 60000); // Re-enable after 1 minute
          }
        }
      }
      
      // All providers failed
      throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
      
    } catch (error) {
      this.logger.error('Test strip analysis failed:', error);
      throw new Error(`Failed to analyze test strip: ${error.message}`);
    }
  }

  private async analyzeWithGemini(imageUrl: string, prompt: string): Promise<any> {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized');
    }

    // Use the Pro Vision model for better accuracy
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro-latest',  // Pro model for better accuracy
      generationConfig: {
        temperature: 0.1,  // Lower temperature for more consistent results
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 1024,
      }
    });
    
    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }]
    });
    
    const response = await result.response;
    const text = response.text();
    
    this.logger.log('Gemini raw response preview:', text.substring(0, 200) + '...');
    
    // Parse the structured response
    return this.parseAIResponse(text);
  }

  private async analyzeWithGeminiRaw(imageUrl: string, prompt: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized');
    }
    
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]);
      
      const response = await result.response;
      const text = response.text();
      this.logger.log('Gemini raw response preview:', text.substring(0, 200) + '...');
      
      // Return raw text instead of parsing
      return text;
    } catch (error) {
      this.logger.error('Gemini analysis failed:', error);
      throw error;
    }
  }

  private async analyzeWithClaude(imageUrl: string, prompt: string): Promise<any> {
    if (!this.anthropic) {
      throw new Error('Claude AI not initialized');
    }

    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    });
    
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAIResponse(text);
  }

  private async analyzeWithClaudeRaw(imageUrl: string, prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude AI not initialized');
    }
    
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      this.logger.log('Claude raw response preview:', text.substring(0, 200) + '...');
      
      // Return raw text instead of parsing
      return text;
    } catch (error) {
      this.logger.error('Claude analysis failed:', error);
      throw error;
    }
  }

  private getTestStripPrompt(): string {
    return `You are a professional pool water chemistry analyst. Your task is to analyze ONLY what is actually shown on this specific test strip and its reference chart.

CRITICAL INSTRUCTIONS:
1. FIRST: Identify the reference chart in the image - this shows which chemicals THIS strip measures
2. SECOND: Count the number of test pads on the strip
3. THIRD: Match each pad to its corresponding chemical on the reference chart
4. IMPORTANT: Only report values for chemicals that are ACTUALLY on this strip's reference chart
5. Set ALL other chemical values to null - do not guess or estimate chemicals not on this strip

ANALYSIS PROCESS:
Step 1: Examine the reference chart to identify which chemicals are tested
Step 2: Count the test pads (typically 4-7 on most strips)
Step 3: Match pad colors to the reference chart values
Step 4: Report ONLY those chemicals, set everything else to null

COMMON TEST STRIP CONFIGURATIONS:
- Basic (4 pads): Free Chlorine, pH, Alkalinity, Hardness
- Standard (5 pads): + Cyanuric Acid
- Advanced (6-7 pads): May add ONE of: Copper, Iron, or Salt
- Professional (7+ pads): Various combinations

COLOR READING GUIDELINES:
- Match colors as closely as possible to the reference chart
- If between two values, choose the closest match
- Consider lighting conditions but trust the reference chart

Return a JSON object with these fields (use null for any chemical NOT on this strip):
{
  "readings": {
    "freeChlorine": <number or null>,
    "totalChlorine": <number or null>,
    "ph": <number or null>,
    "alkalinity": <number or null>,
    "totalHardness": <number or null>,
    "cyanuricAcid": <number or null>,
    "copper": <number or null>,
    "iron": <number or null>,
    "phosphates": <number or null>,
    "salt": <number or null>,
    "bromine": <number or null>
  },
  "stripInfo": {
    "detectedChemicals": ["list", "of", "chemicals", "actually", "on", "this", "strip"],
    "padCount": <number of pads visible>,
    "brand": "<if visible on chart>",
    "notes": "e.g., '5-pad strip testing FC, pH, Alk, CYA, and Hardness'"
  },
  "confidence": <0.5-1.0>,
  "analysisNotes": "<any observations about the reading quality or challenges>"
}

CRITICAL REMINDER: If a chemical is NOT shown on the reference chart, you MUST return null for that value. Never make up readings for chemicals that aren't being tested by this specific strip.`;
  }

  private enhanceReadingsIfNeeded(readings: any): any {
    // Only enhance readings if they were marked as estimated
    // Do NOT add values for chemicals not on the strip
    
    // This method is now primarily for backwards compatibility
    // and should not add new chemical readings
    
    return readings;
  }

  private parseAIResponse(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.readings || typeof parsed.readings !== 'object') {
        throw new Error('Invalid response structure from AI');
      }
      
      // Log what chemicals were actually detected
      if (parsed.stripInfo?.detectedChemicals) {
        this.logger.log(`Test strip detected chemicals: ${parsed.stripInfo.detectedChemicals.join(', ')}`);
        this.logger.log(`Pad count: ${parsed.stripInfo.padCount}`);
        
        // Count non-null readings
        const nonNullReadings = Object.entries(parsed.readings)
          .filter(([key, value]) => value !== null)
          .map(([key]) => key);
        
        this.logger.log(`Non-null readings: ${nonNullReadings.join(', ')}`);
        
        // Verify consistency
        if (nonNullReadings.length !== parsed.stripInfo.detectedChemicals.length) {
          this.logger.warn('Mismatch between detected chemicals and non-null readings');
        }
      }
      
      // Map totalHardness to calcium if calcium is null
      if (parsed.readings.calcium === null && parsed.readings.totalHardness !== null) {
        parsed.readings.calcium = parsed.readings.totalHardness;
      }
      
      // Calculate TDS if not provided but we have other values
      if (parsed.readings.tds === null) {
        // TDS estimation based on other parameters
        const estimatedTDS = this.estimateTDS(parsed.readings);
        if (estimatedTDS !== null) {
          parsed.readings.tds = estimatedTDS;
          parsed.readings.tdsEstimated = true;
        }
      }
      
      // Enhance readings if needed for legacy compatibility
      parsed.readings = this.enhanceReadingsIfNeeded(parsed.readings);
      
      return parsed;
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  private estimateTDS(readings: any): number | null {
    // Professional TDS estimation based on measured parameters
    if (!readings.ph) return null;
    
    let tds = 0;
    
    // Each parameter contributes to TDS
    if (readings.calcium) tds += readings.calcium * 2.5;
    if (readings.alkalinity) tds += readings.alkalinity * 1.2;
    if (readings.salt) tds += readings.salt * 0.5;
    if (readings.cyanuricAcid) tds += readings.cyanuricAcid * 0.8;
    
    // Basic water TDS baseline
    tds += 200;
    
    return Math.round(tds);
  }

  async analyzePoolSatellite(address: string, sessionId: string): Promise<any> {
    try {
      console.log(`🛰️ [AI Service] Starting satellite analysis for address: ${address}`);
      
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
      console.log('📍 [AI Service] Geocoded location:', location);
      
      // Get static map with higher resolution
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=20&size=640x640&scale=2&maptype=satellite&key=${this.configService.get<string>('GOOGLE_MAPS_API_KEY')}`;
      console.log('🗺️ [AI Service] Fetching satellite image from Google Maps...');

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
      console.log('☁️ [AI Service] Image uploaded to storage:', uploadResult.url);

      // Use provider fallback for analysis
      let lastError: Error | null = null;
      
      for (const provider of this.generalAIProviders) {
        if (!provider.available) {
          console.log(`⏭️ [AI Service] Skipping ${provider.name} - not available`);
          continue;
        }
        
        console.log(`🤖 [AI Service] Attempting analysis with ${provider.name}...`);
        try {
          const aiResponse = await provider.analyze(
            uploadResult.url,
            this.getPoolSatellitePrompt()
          );
          console.log(`✅ [AI Service] ${provider.name} analysis successful:`, {
            resultType: typeof aiResponse,
            resultLength: JSON.stringify(aiResponse).length
          });
          
          // Parse the AI response to extract structured data
          const parsedAnalysis = this.satelliteParser.parse(aiResponse);
          console.log('📊 [AI Service] Parsed analysis:', parsedAnalysis);
          
          return {
            success: true,
            location: {
              lat: location.lat,
              lng: location.lng,
              address: formattedAddress,
            },
            satelliteImageUrl: uploadResult.url,
            analysis: {
              poolDetected: parsedAnalysis.poolDetected || false,
              poolDimensions: parsedAnalysis.poolDimensions,
              poolShape: parsedAnalysis.poolShape,
              poolFeatures: parsedAnalysis.poolFeatures,
              propertyFeatures: parsedAnalysis.propertyFeatures,
              confidence: parsedAnalysis.confidence || 0.85,
              aiModel: provider.name,
            }
          };
        } catch (error) {
          console.error(`❌ [AI Service] ${provider.name} failed:`, error.message);
          lastError = error;
        }
      }
      
      throw new Error(`Failed to analyze satellite image: ${lastError?.message}`);
    } catch (error) {
      this.logger.error('Pool satellite analysis failed:', error);
      throw new BadRequestException('Failed to analyze pool location');
    }
  }

  private getPoolSatellitePrompt(): string {
    return `Analyze this satellite image of a residential property and identify pool-related features.

You MUST respond with ONLY a valid JSON object. No markdown formatting, no code blocks, no comments, no explanations before or after.

Required JSON structure (use exactly these field names):
{
  "pool_presence": true/false,
  "pool_type": "inground|above_ground",
  "pool_dimensions": {
    "length": "number in feet",
    "width": "number in feet"
  },
  "pool_shape": "rectangle|kidney|oval|freeform|round",
  "deck_present": true/false,
  "deck_material_condition": "material type and condition as string",
  "features": ["spa", "waterfall", "spillover"],
  "surrounding_landscape": "description of trees and landscaping as a single string",
  "tree_count": number,
  "trees_near_pool": true/false,
  "landscape_type": "tropical|desert|mediterranean|temperate",
  "property_size": "small|medium|large",
  "confidence": 0.0-1.0
}

Important:
- Respond with ONLY the JSON object
- Determine if pool is inground (built into ground) or above_ground (portable/temporary)
- Use numbers for dimensions (not strings with units)
- All fields are required (use empty arrays for features if none)
- No comments or additional text`;
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
      
      // Use provider fallback for analysis
      let lastError: Error | null = null;
      
      for (const provider of this.aiProviders) {
        if (!provider.available) continue;
        
        try {
          const result = await provider.analyze(
            uploadResult.url,
            this.getEquipmentPrompt(equipmentType)
          );
          
          return {
            success: true,
            imageUrl: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            analysis: {
              ...result,
              timestamp: new Date().toISOString(),
              aiModel: provider.name,
            }
          };
        } catch (error) {
          lastError = error;
        }
      }
      
      throw new Error(`Failed to analyze equipment: ${lastError?.message}`);
    } catch (error) {
      this.logger.error('Equipment analysis failed:', error);
      throw new BadRequestException('Failed to analyze equipment');
    }
  }

  private getEquipmentPrompt(equipmentType?: string): string {
    return `You are a pool equipment expert. Analyze this pool equipment image.
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
  }

  async generateWaterChemistryInsights(readings: any, sessionId: string): Promise<any> {
    try {
      this.logger.log(`Generating water chemistry insights for session: ${sessionId}`);
      
      if (!this.anthropic) {
        throw new Error('Claude AI not available for insights generation');
      }
      
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
      
      // Use provider fallback for analysis
      let lastError: Error | null = null;
      
      for (const provider of this.aiProviders) {
        if (!provider.available) continue;
        
        try {
          const result = await provider.analyze(
            uploadResult.url,
            this.getPoolSurfacePrompt()
          );
          
          // Parse the AI response using the parser
          const parsedResult = this.parsePoolSurfaceResponse(result);

          return {
            success: true,
            imageUrl: uploadResult.url,
            analysis: parsedResult  // Now returns the properly parsed structure
          };
        } catch (error) {
          lastError = error;
        }
      }
      
      throw new Error(`Failed to analyze pool surface: ${lastError?.message}`);
    } catch (error) {
      this.logger.error('Pool surface analysis failed:', error);
      throw new BadRequestException('Failed to analyze pool surface');
    }
  }

  private getPoolSurfacePrompt(): string {
    return SurfaceAnalysisPrompt.getCurrentPrompt();
  }

  private parsePoolSurfaceResponse(aiResponse: any): any {
    const parsed = this.surfaceParser.parse(aiResponse);
    
    // Ensure all issue severities are properly normalized
    if (parsed.issues) {
      const rawIssues = parsed.issues;
      parsed.issues = {
        stains: this.normalizeIssueSeverity(rawIssues.stains, ['none', 'light', 'moderate', 'heavy']),
        cracks: this.normalizeIssueSeverity(rawIssues.cracks, ['none', 'minor', 'major']),
        roughness: this.normalizeIssueSeverity(rawIssues.roughness, ['smooth', 'slightly rough', 'very rough']),
        discoloration: this.normalizeIssueSeverity(rawIssues.discoloration, ['none', 'minor', 'significant']),
        etching: this.normalizeIssueSeverity(rawIssues.etching, ['none', 'minor', 'moderate', 'severe']),
        scaling: this.normalizeIssueSeverity(rawIssues.scaling, ['none', 'light', 'moderate', 'heavy']),
        chipping: this.normalizeIssueSeverity(rawIssues.chipping, ['none', 'minor', 'moderate', 'severe']),
        hollow_spots: this.normalizeIssueSeverity(rawIssues.hollow_spots, ['none', 'few', 'many'])
      };
    }
    
    return parsed;
  }

  private normalizeIssueSeverity(value: any, validOptions: string[]): string {
    if (!value) return validOptions[0]; // Return 'none' or first option
    
    const normalized = value.toString().toLowerCase();
    return validOptions.find(opt => opt === normalized) || validOptions[0];
  }

  async analyzePoolEnvironment(images: string[], sessionId: string): Promise<any> {
    try {
      this.logger.log(`Analyzing pool environment for session: ${sessionId}`);
      
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
      
      // Analyze with available providers
      let lastError: Error | null = null;
      
      for (const provider of this.aiProviders) {
        if (!provider.available) continue;
        
        try {
          // For multiple images, we'll analyze the first one as representative
          const result = await provider.analyze(
            uploadedImages[0],
            this.getEnvironmentPrompt()
          );
          
          const parsedResult = this.environmentParser.parse(result);

          return {
            success: true,
            imageUrls: uploadedImages,
            analysis: parsedResult
          };
        } catch (error) {
          lastError = error;
        }
      }
      
      throw new Error(`Failed to analyze environment: ${lastError?.message}`);
    } catch (error) {
      this.logger.error('Environment analysis failed:', error);
      throw new BadRequestException('Failed to analyze pool environment');
    }
  }

  private getEnvironmentPrompt(): string {
    return `Analyze these pool environment images as a pool maintenance expert.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations.

Return this exact JSON structure:
{
  "vegetation": {
    "trees_present": true/false,
    "tree_count": number,
    "tree_types": ["oak", "palm", etc],
    "proximity_to_pool": "close|moderate|far",
    "overhang_risk": "none|low|medium|high",
    "debris_risk": "low|medium|high"
  },
  "ground_conditions": {
    "surface_type": "grass|dirt|both|concrete|mulch",
    "drainage": "good|fair|poor",
    "erosion_risk": "none|low|medium|high",
    "sprinklers_present": true/false
  },
  "environmental_factors": {
    "sun_exposure": "full_sun|partial_shade|heavy_shade",
    "wind_exposure": "low|moderate|high",
    "privacy_level": "open|partial|private"
  },
  "maintenance_challenges": ["specific challenges"],
  "recommendations": ["specific recommendations"]
}`;
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
      
      // Use provider fallback for analysis
      let lastError: Error | null = null;
      
      for (const provider of this.aiProviders) {
        if (!provider.available) continue;
        
        try {
          const result = await provider.analyze(
            uploadedImages[0],
            this.getSkimmerPrompt()
          );
          
          const parsedResult = this.skimmerParser.parse(result);

          return {
            success: true,
            imageUrls: uploadedImages,
            analysis: parsedResult
          };
        } catch (error) {
          lastError = error;
        }
      }
      
      throw new Error(`Failed to analyze skimmers: ${lastError?.message}`);
    } catch (error) {
      this.logger.error('Skimmer analysis failed:', error);
      throw new BadRequestException('Failed to analyze skimmers');
    }
  }

  private getSkimmerPrompt(): string {
    return `Analyze these pool skimmer images as a pool equipment expert.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations.

Return this exact JSON structure:
{
  "detectedSkimmerCount": number,
  "skimmers": [
    {
      "basketCondition": "clean|dirty|damaged|missing",
      "lidCondition": "intact|cracked|missing",
      "weirDoorCondition": "good|stuck|missing",
      "housingCondition": "excellent|good|fair|poor",
      "visibleDamage": true/false,
      "debrisLevel": "none|light|moderate|heavy"
    }
  ],
  "overallCondition": "excellent|good|fair|poor",
  "maintenanceNeeded": ["specific maintenance items"],
  "recommendations": ["specific recommendations"]
}`;
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
      
      // Use provider fallback for analysis
      let lastError: Error | null = null;
      
      for (const provider of this.aiProviders) {
        if (!provider.available) continue;
        
        try {
          const result = await provider.analyze(
            uploadedImages[0],
            this.getDeckPrompt()
          );
          
          const parsedResult = this.deckParser.parse(result);

          return {
            success: true,
            imageUrls: uploadedImages,
            analysis: parsedResult
          };
        } catch (error) {
          lastError = error;
        }
      }
      
      throw new Error(`Failed to analyze deck: ${lastError?.message}`);
    } catch (error) {
      this.logger.error('Deck analysis failed:', error);
      throw new BadRequestException('Failed to analyze deck');
    }
  }

  private getDeckPrompt(): string {
    return `Analyze these pool deck images as a hardscape expert.

CRITICAL: Return ONLY valid JSON - no markdown, no explanations.

Return this exact JSON structure:
{
  "material": "pavers|stamped_concrete|concrete|natural_stone|tile|wood|composite|other",
  "condition": "excellent|good|fair|poor",
  "cleanliness": "pristine|clean|dirty|filthy",
  "issues": {
    "cracks": true/false,
    "stains": true/false,
    "algae_growth": true/false,
    "uneven_surfaces": true/false,
    "drainage_issues": true/false
  },
  "safety_concerns": ["trip hazards", "slippery areas", etc],
  "maintenance_needed": ["pressure washing", "sealing", etc],
  "recommendations": ["specific recommendations"]
}`;
  }

  // Helper methods
  private validateWaterChemistry(readings: any): any {
    const ranges: Record<string, { min: number; max: number }> = {
      freeChlorine: { min: 0, max: 10 },
      totalChlorine: { min: 0, max: 10 },
      bromine: { min: 0, max: 20 },
      ph: { min: 6.2, max: 8.4 },
      alkalinity: { min: 0, max: 240 },
      totalHardness: { min: 0, max: 1000 },
      calcium: { min: 0, max: 1000 },
      cyanuricAcid: { min: 0, max: 300 },
      copper: { min: 0, max: 3 },
      iron: { min: 0, max: 3 },
      nitrate: { min: 0, max: 50 },
      nitrite: { min: 0, max: 10 },
      phosphates: { min: 0, max: 2500 },
      salt: { min: 0, max: 6000 },
      biguanide: { min: 0, max: 50 },
      ammonia: { min: 0, max: 6 },
      tds: { min: 0, max: 3000 },
      orp: { min: 0, max: 900 },
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