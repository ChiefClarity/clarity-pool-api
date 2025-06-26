import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeAnalysisService {
  private readonly logger = new Logger(ClaudeAnalysisService.name);
  private claude: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.claude = new Anthropic({ apiKey });
    }
  }

  async analyzeWaterChemistry(chemistry: any) {
    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const prompt = `You are an expert pool chemistry analyst. Analyze these water test results:

    Water Chemistry:
    - pH: ${chemistry.ph}
    - Free Chlorine: ${chemistry.chlorine} ppm
    - Total Alkalinity: ${chemistry.alkalinity} ppm
    - Calcium Hardness: ${chemistry.calciumHardness || chemistry.calcium} ppm
    - Cyanuric Acid: ${chemistry.cyanuricAcid} ppm
    - Salt: ${chemistry.salt || 'N/A'} ppm
    - Temperature: ${chemistry.temperature || 'N/A'}°F
    ${chemistry.phosphates ? `- Phosphates: ${chemistry.phosphates} ppm` : ''}
    ${chemistry.copper ? `- Copper: ${chemistry.copper} ppm` : ''}
    ${chemistry.iron ? `- Iron: ${chemistry.iron} ppm` : ''}

    Provide a professional analysis including:
    1. Overall water status (balanced/needs_attention/critical)
    2. Specific issues that need addressing
    3. Prioritized recommendations with chemical amounts
    4. Safety concerns if any
    5. Cost estimate for chemicals needed

    Format as JSON with this structure:
    {
      "status": "balanced|needs_attention|critical",
      "issues": [
        {
          "parameter": "string",
          "severity": "low|medium|high",
          "description": "string"
        }
      ],
      "recommendations": [
        {
          "action": "string",
          "chemical": "string",
          "amount": "string",
          "priority": "immediate|soon|routine",
          "estimatedCost": number
        }
      ],
      "safetyWarnings": ["string"],
      "totalChemicalCost": number,
      "summary": "string"
    }`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      this.logger.error('Claude water analysis failed', error);
      throw error;
    }
  }

  async transcribeAndAnalyzeVoiceNote(audioTranscript: string, duration: number) {
    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const prompt = `Analyze this voice note from a pool technician during an onboarding inspection:

    Duration: ${duration} seconds
    Transcript: "${audioTranscript}"

    Extract and provide:
    1. Key observations about pool condition
    2. Equipment issues mentioned
    3. Safety concerns
    4. Maintenance recommendations
    5. Special circumstances affecting pricing
    6. Customer-specific notes
    7. Summary in 2-3 sentences

    Format as JSON with these fields:
    {
      "summary": "brief overview",
      "keyObservations": ["list"],
      "equipmentIssues": ["list"],
      "safetyConcerns": ["list"],
      "maintenanceRecommendations": ["list"],
      "pricingFactors": ["list"],
      "customerNotes": ["list"]
    }`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      this.logger.error('Claude voice analysis failed', error);
      throw error;
    }
  }

  async generateComprehensiveReport(sessionData: any, equipmentAnalysis: any, voiceAnalysis: any, satelliteData: any) {
    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const prompt = `Generate a comprehensive pool onboarding analysis report based on all collected data.

    Customer: ${sessionData.customer.firstName} ${sessionData.customer.lastName}
    Address: ${sessionData.customer.address}, ${sessionData.customer.city}, ${sessionData.customer.state}
    
    Pool Details:
    ${JSON.stringify(sessionData.poolDetails, null, 2)}
    
    Water Chemistry Analysis:
    ${JSON.stringify(sessionData.waterChemistry, null, 2)}
    
    Equipment Analysis (from Gemini Vision):
    ${JSON.stringify(equipmentAnalysis, null, 2)}
    
    Voice Note Insights:
    ${JSON.stringify(voiceAnalysis, null, 2)}
    
    Property Analysis (from satellite):
    ${JSON.stringify(satelliteData, null, 2)}

    Generate:
    1. Executive summary for customer (friendly, 3-4 sentences)
    2. Detailed findings by category
    3. Prioritized action items with cost estimates
    4. Safety issues requiring immediate attention
    5. Recommended maintenance schedule
    6. Equipment upgrade opportunities with ROI
    7. Monthly membership pricing recommendation based on:
       - Pool size and complexity
       - Equipment condition
       - Tree coverage/debris load
       - Current water condition
       - Special circumstances from voice notes
    8. Long-term cost projections

    Provide clear, customer-friendly language. Format as JSON with comprehensive structure.`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      this.logger.error('Claude report generation failed', error);
      throw error;
    }
  }

  async generatePricing(poolData: any, marketData: any) {
    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    const prompt = `As a pool service pricing expert, analyze this pool and recommend optimal monthly service pricing.

    Pool Data:
    - Size: ${poolData.volume} gallons
    - Equipment condition: ${poolData.equipmentCondition}
    - Tree coverage: ${poolData.treeCoverage}
    - Current water status: ${poolData.waterStatus}
    - Special factors: ${JSON.stringify(poolData.specialFactors)}

    Market Data:
    - Region: ${marketData.region}
    - Average pricing: ${marketData.averagePrice}
    - Competition level: ${marketData.competition}

    Provide pricing recommendation with:
    1. Base monthly service price
    2. Premium service price (with extras)
    3. Justification for pricing
    4. Competitive positioning
    5. Upsell opportunities

    Format as JSON.`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text);
      }
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      this.logger.error('Claude pricing generation failed', error);
      throw error;
    }
  }
}