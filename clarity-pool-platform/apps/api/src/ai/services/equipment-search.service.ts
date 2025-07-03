import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EquipmentSearchService {
  private readonly logger = new Logger(EquipmentSearchService.name);
  private readonly searchEngineId: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(private configService: ConfigService) {
    // Can use same API key as Gemini if unrestricted
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.searchEngineId = this.configService.get<string>('GOOGLE_CSE_ID');
  }

  async searchEquipmentInfo(brand: string, model: string): Promise<any> {
    // Log configuration for debugging
    this.logger.debug('Search configuration:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length,
      searchEngineId: this.searchEngineId,
      query: `${brand} ${model} pool equipment specifications`
    });

    if (!this.searchEngineId) {
      this.logger.warn('Google Custom Search Engine ID not configured');
      return null;
    }

    if (!this.apiKey) {
      this.logger.warn('API key not configured for Custom Search');
      return null;
    }

    try {
      const query = `${brand} ${model} pool equipment specifications`;
      
      this.logger.log(`Searching for: ${query}`);
      this.logger.log(`Using Search Engine ID: ${this.searchEngineId}`);

      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: this.apiKey,
            cx: this.searchEngineId,
            q: query,
            num: 5,
          },
        },
      );

      return this.extractEquipmentData(
        response.data?.items || [],
        brand,
        model,
      );
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (error.response?.status === 403) {
        this.logger.error('Google Custom Search API 403 Error - Possible causes:');
        this.logger.error('1. Custom Search API not enabled in Google Cloud Console');
        this.logger.error('2. API key restrictions blocking the request');
        this.logger.error('3. Search Engine ID misconfigured');
        this.logger.error(`Full error: ${JSON.stringify(error.response.data)}`);
      }
      this.logger.warn(`Search failed for ${brand} ${model}:`, error.message);
      return null;
    }
  }

  private extractEquipmentData(
    searchResults: any[],
    originalBrand: string,
    originalModel: string,
  ): any {
    if (!searchResults || searchResults.length === 0) return null;

    const data: {
      actualBrand: string | null;
      replacementCartridge: string | null;
      specifications: Record<string, any>;
    } = {
      actualBrand: null,
      replacementCartridge: null,
      specifications: {},
    };

    // Look through search results
    for (const result of searchResults) {
      const title = result.title?.toLowerCase() || '';
      const snippet = result.snippet?.toLowerCase() || '';
      const combined = `${title} ${snippet}`;

      // Check if iChlor is actually Pentair
      if (originalModel?.includes('iChlor') && combined.includes('pentair')) {
        data.actualBrand = 'Pentair';
      }

      // Look for cartridge info
      if (
        combined.includes('replacement cartridge') ||
        combined.includes('filter cartridge')
      ) {
        // Extract model numbers using enhanced patterns
        const patterns = [
          /\b(c-\d{4,5})\b/i,              // Hayward: C-7626, C-7656, etc.
          /\b(pjan[\s-]?\d{2,3})\b/i,     // Jandy: PJAN100, PJAN-115, etc.
          /\b(cx\d{3,4}\w*)\b/i,          // Other: CX580XRE, etc.
          /\b(r\d{6})\b/i,                // Pentair: R173214, etc.
          /\b(fc-\d{4})\b/i,              // Filbur: FC-1234, etc.
          /\b4\s*x\s*(c-\d{4})\b/i,       // Multi-pack: 4 x C-7468
        ];

        for (const pattern of patterns) {
          const cartridgeMatch = combined.match(pattern);
          if (cartridgeMatch) {
            data.replacementCartridge = cartridgeMatch[1].toUpperCase();
            break;
          }
        }
      }
    }

    return data;
  }
}
