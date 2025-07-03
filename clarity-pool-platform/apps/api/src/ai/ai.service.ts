import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIError,
} from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import { UploadsService } from '../uploads/uploads.service';
import {
  GoogleCloudAuthService,
  GoogleAuthMethod,
} from '../common/google-cloud-auth.service';
import { InitializationStateService } from '../common/initialization-state.service';
import { SatelliteAnalysisParser } from './parsers/satellite-analysis.parser';
import { SurfaceAnalysisParser } from './parsers/surface-analysis.parser';
import { EnvironmentAnalysisParser } from './parsers/environment-analysis.parser';
import { SkimmerAnalysisParser } from './parsers/skimmer-analysis.parser';
import { DeckAnalysisParser } from './parsers/deck-analysis.parser';
import { EquipmentAnalysisParser } from './parsers/equipment-analysis.parser';
import { SurfaceAnalysisPrompt } from './prompts/surface-analysis.prompt';
import { EquipmentSearchService } from './services/equipment-search.service';

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
    private readonly equipmentParser: EquipmentAnalysisParser,
    private readonly equipmentSearchService: EquipmentSearchService,
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
            analyze: this.analyzeWithGemini.bind(this),
          });

          this.generalAIProviders.push({
            name: 'Gemini',
            available: true,
            analyze: this.analyzeWithGeminiRaw.bind(this),
          });

          this.logger.log('✅ Gemini AI provider added to both provider lists');
        } else {
          this.logger.error(
            '❌ Gemini GoogleGenerativeAI object is null after initialization',
          );
        }
      } else {
        const authMethod = this.googleCloudAuth.getAuthMethod();
        this.logger.log(`Auth method being used: ${authMethod}`);

        if (this.googleCloudAuth.isUsingSecureAuth()) {
          this.logger.warn(
            '⚠️  Gemini SDK does not support service account auth yet - using fallback',
          );
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
          analyze: this.analyzeWithClaude.bind(this),
        });

        this.generalAIProviders.push({
          name: 'Claude',
          available: true,
          analyze: this.analyzeWithClaudeRaw.bind(this),
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

    if (
      this.waterChemistryProviders.length === 0 &&
      this.generalAIProviders.length === 0
    ) {
      throw new Error('No AI providers available - check API configuration');
    }

    // Log the providers array
    this.logger.log(
      `Water Chemistry Providers: ${this.waterChemistryProviders.map((p) => p.name).join(', ')}`,
    );
    this.logger.log(
      `General AI Providers: ${this.generalAIProviders.map((p) => p.name).join(', ')}`,
    );
    this.logger.log(
      `Total providers: ${this.waterChemistryProviders.length} chemistry, ${this.generalAIProviders.length} general`,
    );
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
        { sessionId, analysisType: 'test-strip' },
      );

      this.logger.log(`S3 upload successful: ${uploadResult.url}`);

      // Log available providers
      this.logger.log(
        `Available AI providers: ${this.waterChemistryProviders
          .filter((p) => p.available)
          .map((p) => p.name)
          .join(', ')}`,
      );
      this.logger.log(
        `All providers with status: ${JSON.stringify(this.waterChemistryProviders.map((p) => ({ name: p.name, available: p.available })))}`,
      );

      // Try each AI provider in order
      let lastError: Error | null = null;

      for (let i = 0; i < this.waterChemistryProviders.length; i++) {
        const provider = this.waterChemistryProviders[i];
        this.logger.log(
          `Provider ${i}: ${provider.name}, available: ${provider.available}`,
        );

        if (!provider.available) {
          this.logger.log(`Skipping ${provider.name} - marked as unavailable`);
          continue;
        }

        try {
          this.logger.log(`Attempting analysis with ${provider.name}...`);
          this.logger.log(
            `Provider analyze function exists: ${!!provider.analyze}`,
          );

          const result = await provider.analyze(
            uploadResult.url,
            this.getTestStripPrompt(),
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
              sessionId,
            },
          };
        } catch (error) {
          this.logger.error(`${provider.name} analysis failed:`, error);
          this.logger.error(`Error type: ${error.constructor.name}`);
          this.logger.error(`Error message: ${error.message}`);
          lastError = error;

          // Mark provider as temporarily unavailable if it's a rate limit or auth error
          if (error.status === 403 || error.status === 429) {
            provider.available = false;
            this.logger.warn(
              `Marking ${provider.name} as temporarily unavailable due to ${error.status} error`,
            );
            setTimeout(() => {
              provider.available = true;
              this.logger.log(`${provider.name} re-enabled after cooldown`);
            }, 60000); // Re-enable after 1 minute
          }
        }
      }

      // All providers failed
      throw new Error(
        `All AI providers failed. Last error: ${lastError?.message}`,
      );
    } catch (error) {
      this.logger.error('Test strip analysis failed:', error);
      throw new Error(`Failed to analyze test strip: ${error.message}`);
    }
  }

  private async analyzeWithGemini(
    imageUrl: string,
    prompt: string,
  ): Promise<any> {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized');
    }

    // Use the Pro Vision model for better accuracy
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest', // Pro model for better accuracy
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent results
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 1024,
      },
    });

    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const text = response.text();

    this.logger.log(
      'Gemini raw response preview:',
      text.substring(0, 200) + '...',
    );

    // Parse the structured response
    return this.parseAIResponse(text);
  }

  private async analyzeWithGeminiRaw(
    imageUrl: string,
    prompt: string,
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();
      this.logger.log(
        'Gemini raw response preview:',
        text.substring(0, 200) + '...',
      );

      // Return raw text instead of parsing
      return text;
    } catch (error) {
      this.logger.error('Gemini analysis failed:', error);
      throw error;
    }
  }

  private async analyzeWithClaude(
    imageUrl: string,
    prompt: string,
  ): Promise<any> {
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
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAIResponse(text);
  }

  private async analyzeWithClaudeRaw(
    imageUrl: string,
    prompt: string,
  ): Promise<string> {
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

      const text =
        message.content[0].type === 'text' ? message.content[0].text : '';
      this.logger.log(
        'Claude raw response preview:',
        text.substring(0, 200) + '...',
      );

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
        this.logger.log(
          `Test strip detected chemicals: ${parsed.stripInfo.detectedChemicals.join(', ')}`,
        );
        this.logger.log(`Pad count: ${parsed.stripInfo.padCount}`);

        // Count non-null readings
        const nonNullReadings = Object.entries(parsed.readings)
          .filter(([key, value]) => value !== null)
          .map(([key]) => key);

        this.logger.log(`Non-null readings: ${nonNullReadings.join(', ')}`);

        // Verify consistency
        if (
          nonNullReadings.length !== parsed.stripInfo.detectedChemicals.length
        ) {
          this.logger.warn(
            'Mismatch between detected chemicals and non-null readings',
          );
        }
      }

      // Map totalHardness to calcium if calcium is null
      if (
        parsed.readings.calcium === null &&
        parsed.readings.totalHardness !== null
      ) {
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
      console.log(
        `🛰️ [AI Service] Starting satellite analysis for address: ${address}`,
      );

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
      const formattedAddress =
        geocodeResponse.data.results[0].formatted_address;
      console.log('📍 [AI Service] Geocoded location:', location);

      // Get static map with higher resolution
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=20&size=640x640&scale=2&maptype=satellite&key=${this.configService.get<string>('GOOGLE_MAPS_API_KEY')}`;
      console.log(
        '🗺️ [AI Service] Fetching satellite image from Google Maps...',
      );

      // Fetch and upload satellite image
      const imageResponse = await fetch(staticMapUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'pool',
        { sessionId, analysisType: 'satellite', address: formattedAddress },
      );
      console.log(
        '☁️ [AI Service] Image uploaded to storage:',
        uploadResult.url,
      );

      // Use provider fallback for analysis
      let lastError: Error | null = null;

      for (const provider of this.generalAIProviders) {
        if (!provider.available) {
          console.log(
            `⏭️ [AI Service] Skipping ${provider.name} - not available`,
          );
          continue;
        }

        console.log(
          `🤖 [AI Service] Attempting analysis with ${provider.name}...`,
        );
        try {
          const aiResponse = await provider.analyze(
            uploadResult.url,
            this.getPoolSatellitePrompt(),
          );
          console.log(`✅ [AI Service] ${provider.name} analysis successful:`, {
            resultType: typeof aiResponse,
            resultLength: JSON.stringify(aiResponse).length,
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
            },
          };
        } catch (error) {
          console.error(
            `❌ [AI Service] ${provider.name} failed:`,
            error.message,
          );
          lastError = error;
        }
      }

      throw new Error(
        `Failed to analyze satellite image: ${lastError?.message}`,
      );
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

  async analyzeEquipment(
    images: string | string[],
    sessionId: string,
    equipmentType?: string,
  ): Promise<any> {
    try {
      this.logger.log(`Analyzing equipment for session: ${sessionId}`);

      // Handle both single image (legacy) and multiple images
      const imageArray = Array.isArray(images) ? images : [images];
      this.logger.log(`Processing ${imageArray.length} equipment images`);

      const uploadedImages: Array<{ url: string; thumbnailUrl: string }> = [];

      // Upload all equipment images
      for (let i = 0; i < imageArray.length; i++) {
        const base64Data = imageArray[i].replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const uploadResult = await this.uploadsService.uploadImage(
          imageBuffer,
          'image/jpeg',
          'equipment',
          {
            sessionId,
            analysisType: 'equipment',
            equipmentType: equipmentType || 'unknown',
            imageIndex: i.toString(),
          },
        );

        uploadedImages.push({
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.url,
        });
      }

      // Process all images in parallel for better performance
      const analyzePromises = uploadedImages.map(async (image, index) => {
        for (const provider of this.aiProviders) {
          if (!provider.available) continue;

          try {
            this.logger.log(
              `Analyzing equipment image ${index + 1} with ${provider.name}`,
            );

            const result = await provider.analyze(
              image.url,
              this.getEquipmentPrompt(equipmentType),
            );

            // Parse each equipment analysis
            const parsedResult = this.equipmentParser.parse(result);

            // Handle generic timers with null brand/model
            if (parsedResult.equipmentType === 'timer') {
              parsedResult.brand = parsedResult.brand || 'Generic';
              parsedResult.model = parsedResult.model || 'Mechanical Timer';

              // Log timer detection for debugging
              this.logger.log(
                `Timer detected - Settings: ${JSON.stringify(parsedResult.timerSettings)}`,
              );
            }

            // Only search for filter replacement cartridges
            if (
              parsedResult.equipmentType === 'filter' &&
              parsedResult.brand &&
              parsedResult.model
            ) {
              const searchData =
                await this.equipmentSearchService.searchEquipmentInfo(
                  parsedResult.brand,
                  parsedResult.model,
                );

              if (searchData) {
                if (searchData.actualBrand) {
                  this.logger.log(
                    `Correcting brand from ${parsedResult.brand} to ${searchData.actualBrand}`,
                  );
                  parsedResult.brand = searchData.actualBrand;
                }
                if (
                  searchData.replacementCartridge &&
                  parsedResult.equipmentType === 'filter'
                ) {
                  this.logger.log(
                    `Found replacement cartridge: ${searchData.replacementCartridge}`,
                  );
                  parsedResult.replacementCartridge =
                    searchData.replacementCartridge;
                }
              }
            }

            // Add image metadata
            if (parsedResult.equipmentType !== 'unknown') {
              return {
                ...parsedResult,
                imageIndex: index,
                imageUrl: image.url,
              };
            }

            return parsedResult;
          } catch (error) {
            this.logger.warn(
              `Provider ${provider.name} failed for image ${index + 1}: ${error.message}`,
            );
            // Continue to next provider
          }
        }

        // All providers failed for this image
        return {
          equipmentType: 'unknown',
          equipmentSubtype: 'unknown',
          brand: 'unknown',
          model: 'unknown',
          serialNumber: '',
          age: 'unknown',
          condition: 'unknown',
          replacementCartridge: '',
          issues: {
            rust: false,
            leaks: false,
            cracks: false,
            electricalIssues: false,
            missingParts: false,
            noise: false,
          },
          specifications: {
            horsepower: '',
            voltage: '',
            filterSize: '',
            flowRate: '',
            capacity: '',
          },
          maintenanceNeeded: [],
          recommendations: [],
          detectedEquipment: [],
          pressureReading: null,
          timerSettings: {
            onTime: '',
            offTime: '',
            duration: '',
          },
          confidence: 0,
        };
      });

      // Wait for all analyses to complete
      const analyzedEquipment = await Promise.all(analyzePromises);

      // Filter out any failed analyses and build detected equipment list
      const allDetectedEquipment = analyzedEquipment
        .filter((eq) => eq.equipmentType !== 'unknown')
        .map((eq, idx) => ({
          type: eq.equipmentType,
          brand: eq.brand,
          model: eq.model,
          condition: eq.condition,
          imageIndex: idx,
          imageUrl: uploadedImages[idx].url,
        }));

      // If no equipment was successfully analyzed
      if (
        allDetectedEquipment.length === 0 &&
        analyzedEquipment.every((eq) => eq.equipmentType === 'unknown')
      ) {
        throw new Error(
          'Failed to analyze equipment: All providers failed for all images',
        );
      }

      // Aggregate results from all images
      const aggregatedAnalysis = this.aggregateEquipmentAnalysis(
        analyzedEquipment,
        allDetectedEquipment,
      );

      return {
        success: true,
        imageUrls: uploadedImages.map((img) => img.url),
        thumbnailUrls: uploadedImages.map((img) => img.thumbnailUrl),
        analysis: aggregatedAnalysis,
      };
    } catch (error) {
      this.logger.error('Equipment analysis failed:', error);
      throw new BadRequestException('Failed to analyze equipment');
    }
  }

  private aggregateEquipmentAnalysis(
    analyzedEquipment: any[],
    detectedEquipment: any[],
  ): any {
    // Find primary equipment (pump, filter, heater, sanitizer)
    const pump = analyzedEquipment.find((eq) => eq.equipmentType === 'pump');
    const filter = analyzedEquipment.find(
      (eq) => eq.equipmentType === 'filter',
    );
    const heater = analyzedEquipment.find(
      (eq) => eq.equipmentType === 'heater',
    );
    const sanitizer = analyzedEquipment.find(
      (eq) =>
        eq.equipmentType === 'chlorinator' || eq.equipmentType === 'sanitizer',
    );

    // Find timer if present
    const timer = analyzedEquipment.find((eq) => eq.equipmentType === 'timer');

    // Use pump as base or first equipment
    const primaryEquipment = pump || filter || analyzedEquipment[0];

    // Aggregate all maintenance needs and recommendations
    const allMaintenanceNeeded = [
      ...new Set(analyzedEquipment.flatMap((eq) => eq.maintenanceNeeded || [])),
    ];

    const allRecommendations = [
      ...new Set(analyzedEquipment.flatMap((eq) => eq.recommendations || [])),
    ];

    // Determine overall condition (worst condition wins)
    const conditionPriority = ['poor', 'fair', 'good', 'excellent'];
    const overallCondition =
      analyzedEquipment
        .map((eq) => eq.condition)
        .filter(Boolean)
        .sort(
          (a, b) => conditionPriority.indexOf(a) - conditionPriority.indexOf(b),
        )[0] || 'unknown';

    return {
      ...primaryEquipment,
      detectedEquipment: detectedEquipment,
      overallCondition: overallCondition,
      maintenanceNeeded: allMaintenanceNeeded,
      recommendations: allRecommendations,
      confidence: Math.max(
        ...analyzedEquipment.map((eq) => eq.confidence || 0),
      ),
      imagesAnalyzed: analyzedEquipment.length,

      // Include specific equipment if detected
      pump: pump
        ? {
            brand: pump.brand,
            model: pump.model,
            serialNumber: pump.serialNumber || analyzedEquipment.find(eq => eq.equipmentType === 'pump' && eq.serialNumber)?.serialNumber || '',
            horsepower: pump.specifications?.horsepower,
            age: pump.age,
            condition: pump.condition,
            type: pump.equipmentSubtype || 'single-speed',
          }
        : null,

      filter: filter
        ? {
            brand: filter.brand,
            model: filter.model,
            serialNumber: filter.serialNumber || analyzedEquipment.find(eq => eq.equipmentType === 'filter' && eq.serialNumber)?.serialNumber || '',
            type: filter.equipmentSubtype || 'cartridge',
            size: filter.specifications?.filterSize,
            condition: filter.condition,
            replacementCartridge: filter.replacementCartridge,
          }
        : null,

      heater: heater
        ? {
            brand: heater.brand,
            model: heater.model,
            serialNumber: heater.serialNumber || analyzedEquipment.find(eq => eq.equipmentType === 'heater' && eq.serialNumber)?.serialNumber || '',
            capacity: heater.specifications?.capacity,
            condition: heater.condition,
            type: heater.equipmentSubtype || 'gas',
          }
        : null,

      sanitizer: sanitizer
        ? {
            brand: sanitizer.brand,
            model: sanitizer.model,
            serialNumber: sanitizer.serialNumber || analyzedEquipment.find(eq => (eq.equipmentType === 'chlorinator' || eq.equipmentType === 'sanitizer') && eq.serialNumber)?.serialNumber || '',
            type: sanitizer.equipmentType,
            condition: sanitizer.condition,
          }
        : null,

      timer: timer
        ? {
            brand: timer.brand,
            model: timer.model,
            type: timer.equipmentSubtype || 'mechanical',
            condition: timer.condition,
            timerSettings: timer.timerSettings || {
              onTime: '',
              offTime: '',
              duration: '',
            },
          }
        : null,
    };
  }

  private getEquipmentPrompt(equipmentType?: string): string {
    return `Analyze this pool equipment image as an expert technician.
${equipmentType ? `The user indicates this is a ${equipmentType}.` : ''}

CRITICAL: Return ONLY valid JSON - no markdown, no explanations.

EQUIPMENT TYPE DETECTION (MUST match these exact values):
PUMPS - Return equipment_subtype as one of:
- "single-speed" for single speed pumps
- "two-speed" for 2-speed pumps  
- "variable-speed" for VS, VSF, or Variable Speed pumps

FILTERS - Return equipment_subtype as one of:
- "cartridge" for cartridge filters (Jandy CS series, Pentair Clean & Clear, etc)
- "DE" for diatomaceous earth filters
- "sand" for sand filters

HEATERS - Return equipment_subtype as one of:
- "gas" for natural gas or propane heaters
- "electric" for electric resistance heaters
- "heat-pump" for heat pump heaters (like Pentair UltraTemp)

SANITIZERS - equipment_type should be:
- "chlorinator" for salt systems (iChlor, AquaRite, etc)

MECHANICAL/ELECTRICAL TIMER ANALYSIS:
For ANY timer device (mechanical dial, digital, or smart):

BRAND DETECTION:
- If no visible brand on timer: brand = "Generic", model = "Mechanical Timer"
- Common timer brands: Intermatic, Tork, NSi, Grasslin

MECHANICAL DIAL TIMERS (with pins/trippers):
1. Identify the dial type:
   - 24-hour dial (numbers 1-24 or military time)
   - 12-hour dial with AM/PM (numbers 1-12 twice)
2. Find the current time arrow/pointer
3. Identify ON/OFF pins or trippers:
   - ON pins: Usually pushed OUT from center or colored differently
   - OFF pins: Usually pushed IN toward center
   - Some timers use clips that slide on the outer edge
4. Read the schedule:
   - Start from 12:00 AM (midnight) position
   - First ON pin/tripper = on_time
   - First OFF pin/tripper after ON = off_time
   - Convert to "HH:MM AM/PM" format
   Example: Pins OUT from 8 to 18 on 24hr dial = "8:00 AM" to "6:00 PM"
   
   CRITICAL: If you can see timer pins/trippers on a mechanical dial:
   - You MUST provide on_time and off_time estimates
   - Use common pool timer patterns (8am-6pm is typical)
   - Only return empty if NO pins are visible
5. If NO pins are visible or timer is digital without visible schedule:
   timer_settings: {
     "on_time": null,
     "off_time": null,
     "duration": null
   }

DIGITAL TIMERS:
- Look for LCD/LED display showing current time
- Check for programmed schedules if visible
- Default to brand = manufacturer name, model = model number

For timer_settings, ALWAYS attempt to read and return:
{
  "on_time": "HH:MM AM/PM" or null if unreadable,
  "off_time": "HH:MM AM/PM" or null if unreadable,
  "duration": calculate hours between on/off or null
}

IMPORTANT: If you can clearly see timer pins but cannot determine exact times, still return your best estimate based on pin positions.

FILTER CARTRIDGE REPLACEMENT MODELS:
If this is a filter, also determine the replacement cartridge:
- Jandy CS100 uses: 4 x C-7468 or PJAN100
- Jandy CS150 uses: 4 x C-7469 or PJAN115  
- Jandy CS200 uses: 4 x C-7470 or PJAN145
- Jandy CS250 uses: 4 x C-7471 or PJAN150
- Pentair Clean & Clear 320 uses: 4 x C-7471
- Pentair Clean & Clear 420 uses: 4 x C-7472
- Hayward C3030 uses: C-7483
- Hayward C4030 uses: CX580XRE

Return this exact JSON structure:
{
  "equipment_type": "pump|filter|heater|chlorinator|automation|valve|timer|other",
  "equipment_subtype": "CRITICAL - use exact values listed above",
  "brand": "exact brand name from label",
  "model": "complete model number",
  "serial_number": "exact serial if clearly visible, null if not",
  "age": "estimated age or null",
  "condition": "excellent|good|fair|poor",
  "replacement_cartridge": "cartridge model if this is a filter, null otherwise",
  "issues": {
    "rust": true/false,
    "leaks": true/false,
    "cracks": true/false,
    "electrical_issues": true/false,
    "missing_parts": true/false,
    "noise": true/false
  },
  "specifications": {
    "horsepower": "HP value or null",
    "voltage": "voltage or null", 
    "filter_size": "sq ft rating or null",
    "flow_rate": "GPM or null",
    "capacity": "BTU rating or null"
  },
  "maintenance_needed": ["specific items"],
  "recommendations": ["specific recommendations"],
  "detected_equipment": [],
  "pressure_reading": null,
  "timer_settings": {
    "on_time": null,
    "off_time": null,
    "duration": null
  }
}`;
  }

  async generateWaterChemistryInsights(
    readings: any,
    sessionId: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Generating water chemistry insights for session: ${sessionId}`,
      );

      if (!this.anthropic) {
        throw new Error('Claude AI not available for insights generation');
      }

      const message = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
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
}`,
          },
        ],
      });

      const content =
        message.content[0].type === 'text' ? message.content[0].text : '';

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
          readingsAnalyzed: Object.keys(readings).filter(
            (k) => readings[k] !== null,
          ).length,
        },
      };
    } catch (error) {
      this.logger.error('Water chemistry insights generation failed:', error);
      throw new BadRequestException('Failed to generate insights');
    }
  }

  async transcribeVoiceNote(
    audioBase64: string,
    sessionId: string,
  ): Promise<any> {
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
        transcription:
          'Voice transcription will be implemented with Google Speech-to-Text API',
        summary: 'Audio note recorded',
        duration: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          sessionId,
          aiModel: 'pending-integration',
        },
      };
    } catch (error) {
      this.logger.error('Voice transcription failed:', error);
      throw new BadRequestException('Failed to transcribe voice note');
    }
  }

  async analyzePoolSurface(
    imageBase64: string,
    sessionId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Analyzing pool surface for session: ${sessionId}`);

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Upload to S3
      const uploadResult = await this.uploadsService.uploadImage(
        imageBuffer,
        'image/jpeg',
        'pool',
        { sessionId, analysisType: 'pool-surface' },
      );

      // Use provider fallback for analysis
      let lastError: Error | null = null;

      for (const provider of this.aiProviders) {
        if (!provider.available) continue;

        try {
          const result = await provider.analyze(
            uploadResult.url,
            this.getPoolSurfacePrompt(),
          );

          // Parse the AI response using the parser
          const parsedResult = this.parsePoolSurfaceResponse(result);

          return {
            success: true,
            imageUrl: uploadResult.url,
            analysis: parsedResult, // Now returns the properly parsed structure
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
        stains: this.normalizeIssueSeverity(rawIssues.stains, [
          'none',
          'light',
          'moderate',
          'heavy',
        ]),
        cracks: this.normalizeIssueSeverity(rawIssues.cracks, [
          'none',
          'minor',
          'major',
        ]),
        roughness: this.normalizeIssueSeverity(rawIssues.roughness, [
          'smooth',
          'slightly rough',
          'very rough',
        ]),
        discoloration: this.normalizeIssueSeverity(rawIssues.discoloration, [
          'none',
          'minor',
          'significant',
        ]),
        etching: this.normalizeIssueSeverity(rawIssues.etching, [
          'none',
          'minor',
          'moderate',
          'severe',
        ]),
        scaling: this.normalizeIssueSeverity(rawIssues.scaling, [
          'none',
          'light',
          'moderate',
          'heavy',
        ]),
        chipping: this.normalizeIssueSeverity(rawIssues.chipping, [
          'none',
          'minor',
          'moderate',
          'severe',
        ]),
        hollow_spots: this.normalizeIssueSeverity(rawIssues.hollow_spots, [
          'none',
          'few',
          'many',
        ]),
      };
    }

    return parsed;
  }

  private normalizeIssueSeverity(value: any, validOptions: string[]): string {
    if (!value) return validOptions[0]; // Return 'none' or first option

    const normalized = value.toString().toLowerCase();
    return validOptions.find((opt) => opt === normalized) || validOptions[0];
  }

  async analyzePoolEnvironment(
    images: string[],
    sessionId: string,
  ): Promise<any> {
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
          { sessionId, analysisType: 'environment', imageIndex: i.toString() },
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
            this.getEnvironmentPrompt(),
          );

          const parsedResult = this.environmentParser.parse(result);

          return {
            success: true,
            imageUrls: uploadedImages,
            analysis: parsedResult,
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
          { sessionId, analysisType: 'skimmer', imageIndex: i.toString() },
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
            this.getSkimmerPrompt(),
          );

          const parsedResult = this.skimmerParser.parse(result);

          return {
            success: true,
            imageUrls: uploadedImages,
            analysis: parsedResult,
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
          { sessionId, analysisType: 'deck', imageIndex: i.toString() },
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
            this.getDeckPrompt(),
          );

          const parsedResult = this.deckParser.parse(result);

          return {
            success: true,
            imageUrls: uploadedImages,
            analysis: parsedResult,
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
          this.logger.warn(
            `${key} value ${numValue} outside normal range [${min}-${max}]`,
          );
          // Clamp to range but flag as suspicious
          validated[key] = Math.max(min, Math.min(max, numValue));
        }
      }
    }

    return validated;
  }

  private calculateConfidence(readings: any): number {
    const nonNullValues = Object.values(readings).filter(
      (v) => v !== null,
    ).length;
    const totalFields = Object.keys(readings).length;
    return Math.round((nonNullValues / totalFields) * 100);
  }
}
