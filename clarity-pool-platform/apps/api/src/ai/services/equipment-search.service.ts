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
      const searchQueries = [
        `${brand} ${model} replacement filter cartridge model number`,
        `${brand} ${model} filter element part number`,
        `what cartridge fits ${brand} ${model} filter`
      ];

      // Try multiple queries
      for (const query of searchQueries) {
        this.logger.log(`Searching: ${query}`);
        
        const response = await axios.get(
          'https://www.googleapis.com/customsearch/v1',
          {
            params: {
              key: this.apiKey,
              cx: this.searchEngineId,
              q: query,
              num: 10, // Get more results
            },
          },
        );

        this.logger.debug(`Search returned ${response.data?.items?.length || 0} results`);
        if (response.data?.items?.[0]) {
          this.logger.debug('First result snippet:', response.data.items[0].snippet);
        }
        
        const extracted = this.extractEquipmentData(
          response.data?.items || [],
          brand,
          model,
        );
        
        if (extracted?.replacementCartridge) {
          return extracted;
        }
      }

      // If no cartridge found, do a general search
      const generalQuery = `${brand} ${model} pool equipment specifications`;
      this.logger.log(`Searching (general): ${generalQuery}`);
      
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: this.apiKey,
            cx: this.searchEngineId,
            q: generalQuery,
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
        originalModel?.toLowerCase().includes('filter') ||
        combined.includes('cartridge') ||
        combined.includes('replacement') ||
        combined.includes('filter element')
      ) {
        // Generic part number patterns
        const patterns = [
          /\b([A-Z]{1,5}[\-\s]?\d{2,6}[A-Z]?)\b/g,  // PJAN100, C-7468, FC-1234A
          /\b(\d{1,2}[\-\s]?[A-Z]\d{2,6})\b/g,      // 4-C7468, 2-A100
          /\b([A-Z]\d{2,6}[\-\s]?[A-Z]{1,3})\b/g,   // R173214-XRE
        ];

        const extractedParts = new Set<string>();

        // Extract all potential part numbers
        for (const pattern of patterns) {
          const matches = combined.matchAll(pattern);
          for (const match of matches) {
            if (match[1]) {
              extractedParts.add(match[1].toUpperCase().replace(/\s/g, ''));
            }
          }
        }

        // Validate extracted parts
        const validParts = Array.from(extractedParts).filter(part => {
          // Must have both letters and numbers
          const hasLetters = /[A-Z]/.test(part);
          const hasNumbers = /\d/.test(part);
          const reasonableLength = part.length >= 4 && part.length <= 15;
          
          // Exclude generic words
          const genericWords = ['cartridge', 'cartridges', 'filter', 'filters', 'replacement', 'element'];
          const isGeneric = genericWords.some(word => 
            part.toLowerCase() === word
          );
          
          return hasLetters && hasNumbers && reasonableLength && !isGeneric;
        });

        // Extract the most likely cartridge model from results
        if (validParts.length > 0) {
          // Score each part based on pattern characteristics
          const scoredParts = validParts.map(part => {
            let score = 0;
            
            // Common patterns get higher scores
            if (/^[A-Z]{1,5}[\-]?\d{2,5}$/.test(part)) score += 20; // Like PJAN115, C-7468
            if (/^\d+[A-Z]+\d+$/.test(part)) score += 15; // Like 4C7468
            if (part.includes('-')) score += 5; // Dashes are common
            
            // Length preferences
            if (part.length >= 5 && part.length <= 10) score += 10;
            
            // Alphanumeric balance
            const letters = (part.match(/[A-Z]/g) || []).length;
            const numbers = (part.match(/\d/g) || []).length;
            if (letters > 0 && numbers > 0 && Math.abs(letters - numbers) < 4) score += 5;
            
            return { part, score };
          });
          
          // Sort by score and take the best one
          const sorted = scoredParts.sort((a, b) => b.score - a.score);
          
          if (sorted.length > 0 && sorted[0].score >= 10) {
            data.replacementCartridge = sorted[0].part;
            this.logger.log(`Selected cartridge: ${data.replacementCartridge} (score: ${sorted[0].score})`);
            
            // Log other candidates for debugging
            if (sorted.length > 1) {
              this.logger.debug('Other candidates:', sorted.slice(1, 4).map(s => `${s.part}(${s.score})`));
            }
          }
        }
      }
    }

    return data;
  }
}
