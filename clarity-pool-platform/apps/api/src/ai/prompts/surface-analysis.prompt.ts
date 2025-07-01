export interface PromptVersion {
  version: string;
  prompt: string;
  createdAt: Date;
  changes: string[];
}

export class SurfaceAnalysisPrompt {
  private static readonly CURRENT_VERSION = '1.2.0';
  
  private static readonly PROMPTS: Record<string, PromptVersion> = {
    '1.2.0': {
      version: '1.2.0',
      createdAt: new Date('2025-07-01'),
      changes: [
        'Added clarification about waterline tile vs surface',
        'Improved plaster identification criteria',
        'Added Diamond Brite as plaster variant',
        'Structured JSON response format with specific issue fields'
      ],
      prompt: `You are an expert pool inspector analyzing a pool surface image.

IMPORTANT: Focus on the MAIN POOL SURFACE (floor and walls below waterline), 
NOT the waterline tile or coping.

CRITICAL: Look for these visual cues to identify surface type:

1. PLASTER (including Diamond Brite):
   - Smooth, painted appearance
   - May have slight texture but generally uniform
   - Can be white, blue, or other solid colors
   - May show some discoloration or staining
   - Diamond Brite has sparkly quartz aggregate mixed in

2. TILE:
   - Visible grout lines between tiles
   - Geometric patterns
   - Glossy/reflective surface
   - Individual tile edges visible

3. PEBBLE:
   - Rough, bumpy texture
   - Individual pebbles/stones visible
   - Natural stone appearance
   - Very textured surface

4. VINYL LINER:
   - Smooth, plastic-like appearance
   - May have printed patterns
   - Seams may be visible
   - Flexible appearance

5. FIBERGLASS:
   - Very smooth, glossy finish
   - Usually white or light blue
   - No visible texture
   - Gel-coat finish

Analyze the image and return ONLY a JSON object with:
{
  "material": "plaster|pebble|tile|vinyl|fiberglass",
  "condition": "excellent|good|fair|poor",
  "issues": {
    "stains": "none|light|moderate|heavy",
    "cracks": "none|minor|major",
    "roughness": "smooth|slightly rough|very rough",
    "discoloration": "none|minor|significant"
  },
  "recommendations": ["specific maintenance suggestions"]
}

BE SPECIFIC: If you see a smooth surface with slight sparkle, it's likely Diamond Brite plaster, not tile.`
    },
    '1.1.0': {
      version: '1.1.0',
      createdAt: new Date('2025-06-15'),
      changes: ['Initial surface analysis prompt'],
      prompt: `Analyze this pool surface image as an expert pool inspector.
    
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

Return a detailed JSON analysis.`
    }
  };

  static getCurrentPrompt(): string {
    const promptVersion = this.PROMPTS[this.CURRENT_VERSION];
    if (!promptVersion) {
      throw new Error(`Prompt version ${this.CURRENT_VERSION} not found`);
    }
    return promptVersion.prompt;
  }

  static getPromptVersion(version: string): PromptVersion | undefined {
    return this.PROMPTS[version];
  }

  static getAllVersions(): string[] {
    return Object.keys(this.PROMPTS).sort().reverse();
  }

  static getChangeLog(): Array<{ version: string; date: Date; changes: string[] }> {
    return this.getAllVersions().map(version => {
      const prompt = this.PROMPTS[version];
      return {
        version: prompt.version,
        date: prompt.createdAt,
        changes: prompt.changes
      };
    });
  }
}