import { Test, TestingModule } from '@nestjs/testing';
import { SurfaceAnalysisParser } from '../surface-analysis.parser';

describe('SurfaceAnalysisParser', () => {
  let parser: SurfaceAnalysisParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SurfaceAnalysisParser],
    }).compile();

    parser = module.get<SurfaceAnalysisParser>(SurfaceAnalysisParser);
  });

  describe('parse', () => {
    it('should parse valid JSON response', () => {
      const aiResponse = {
        material: 'plaster',
        condition: 'good',
        issues: {
          stains: 'light',
          cracks: 'none',
          roughness: 'smooth',
          discoloration: 'minor',
        },
        recommendations: ['Regular brushing recommended'],
        confidence: 0.9,
      };

      const result = parser.parse(aiResponse);

      expect(result.material).toBe('plaster');
      expect(result.condition).toBe('good');
      expect(result.issues.stains).toBe('light');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle markdown-wrapped JSON', () => {
      const aiResponse = `\`\`\`json
{
  "material": "plaster",
  "condition": "fair",
  "issues": {
    "stains": "moderate",
    "cracks": "none",
    "roughness": "smooth",
    "discoloration": "minor"
  },
  "recommendations": ["Clean the pool thoroughly"]
}
\`\`\``;

      const result = parser.parse(aiResponse);

      expect(result.material).toBe('plaster');
      expect(result.condition).toBe('fair');
      expect(result.issues.stains).toBe('moderate');
    });

    it('should handle missing fields with defaults', () => {
      const aiResponse = {
        material: 'tile',
        condition: 'excellent',
        // missing issues and recommendations
      };

      const result = parser.parse(aiResponse);

      expect(result.material).toBe('tile');
      expect(result.condition).toBe('excellent');
      expect(result.issues.stains).toBe('none');
      expect(result.issues.cracks).toBe('none');
      expect(result.recommendations).toEqual([]);
    });

    it('should normalize material variations', () => {
      const variations = [
        { input: 'Diamond Brite', expected: 'plaster' },
        { input: 'PebbleTec', expected: 'pebble' },
        { input: 'ceramic tile', expected: 'tile' },
        { input: 'vinyl liner', expected: 'vinyl' },
      ];

      variations.forEach(({ input, expected }) => {
        const result = parser.parse({ material: input });
        expect(result.material).toBe(expected);
      });
    });

    it('should return default analysis on invalid response', () => {
      const invalidResponse = 'not valid json at all';

      const result = parser.parse(invalidResponse);

      expect(result.material).toBe('unknown');
      expect(result.condition).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle AI response with extra text', () => {
      const aiResponse = `Here's my analysis:
      
      \`\`\`json
      {
        "material": "pebble",
        "condition": "good",
        "issues": {
          "stains": "none",
          "cracks": "minor",
          "roughness": "very rough",
          "discoloration": "none"
        }
      }
      \`\`\`
      
      The pool appears to be in good condition.`;

      const result = parser.parse(aiResponse);

      expect(result.material).toBe('pebble');
      expect(result.issues.roughness).toBe('very rough');
    });
  });
});
