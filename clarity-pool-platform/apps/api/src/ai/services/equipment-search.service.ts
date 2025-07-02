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
    if (!this.searchEngineId) {
      this.logger.warn('Google Custom Search Engine ID not configured');
      return null;
    }

    try {
      const query = `${brand} ${model} pool equipment specifications`;

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
        // Extract model numbers (common patterns)
        const cartridgeMatch = combined.match(/\b(c-\d+|pjan\d+|cx\d+\w*)\b/i);
        if (cartridgeMatch) {
          data.replacementCartridge = cartridgeMatch[1].toUpperCase();
        }
      }
    }

    return data;
  }
}
