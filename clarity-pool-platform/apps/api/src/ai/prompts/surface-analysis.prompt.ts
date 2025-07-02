export interface PromptVersion {
  version: string;
  prompt: string;
  createdAt: Date;
  changes: string[];
}

export class SurfaceAnalysisPrompt {
  private static readonly CURRENT_VERSION = '1.4.0';

  private static readonly PROMPTS: Record<string, PromptVersion> = {
    '1.4.0': {
      version: '1.4.0',
      createdAt: new Date('2025-07-01'),
      changes: [
        'Emphasized JSON-only response requirement',
        'Added explicit instructions against markdown/code blocks',
        'Improved material identification guide',
        'Added confidence score to response',
        'Clearer structure for maintenance recommendations',
      ],
      prompt: `You are an expert pool inspector analyzing a pool surface image.

CRITICAL INSTRUCTIONS:
1. Focus on the MAIN POOL SURFACE (floor and walls BELOW waterline)
2. IGNORE waterline tile, coping, or deck materials
3. Return ONLY valid JSON - no markdown, no code blocks, no explanations

IDENTIFICATION GUIDE:
- WATERLINE TILE: Decorative border at water's edge (6-12 inches tall) - NOT the pool surface
- POOL SURFACE: Material covering the entire floor and walls underwater

Material Types:
- PLASTER: Smooth, uniform surface (may have sparkles if Diamond Brite)
- PEBBLE: Rough texture with visible stones throughout
- TILE: Grout lines covering ALL surfaces including floor (rare)
- VINYL: Smooth plastic-like surface with possible seams
- FIBERGLASS: Very smooth glossy gel-coat finish

IMPORTANT: If you see tile ONLY at waterline with smooth surface below = PLASTER

Return this exact JSON structure with NO additional text:
{
  "material": "plaster|pebble|tile|vinyl|fiberglass",
  "condition": "excellent|good|fair|poor",
  "issues": {
    "stains": "none|light|moderate|heavy",
    "cracks": "none|minor|major",
    "roughness": "smooth|slightly rough|very rough",
    "discoloration": "none|minor|significant"
  },
  "recommendations": ["array of specific maintenance suggestions"],
  "confidence": 0.95
}`,
    },
    '1.3.0': {
      version: '1.3.0',
      createdAt: new Date('2025-07-01'),
      changes: [
        'Enhanced waterline tile vs pool surface distinction',
        'Added critical guidance to avoid waterline tile confusion',
        'Simplified JSON response format',
        'Added specific identification tips for common scenarios',
      ],
      prompt: `You are an expert pool inspector analyzing a pool surface image.

CRITICAL: The pool SURFACE is what's UNDERWATER - the floor and walls BELOW the waterline.
DO NOT confuse decorative waterline tile with the actual pool surface material!

Common mistake: Seeing tile at the waterline and calling the whole pool "tile" when it's actually plaster below.

IDENTIFICATION TIPS:
- WATERLINE TILE: Decorative border at water's edge only (6-12 inches tall)
- POOL SURFACE: The material covering the entire floor and walls underwater

If you see:
- Tile ONLY at the waterline + smooth surface below = PLASTER
- Tile covering ALL surfaces including floor = TILE (rare and expensive)
- Sparkly/textured smooth surface = PLASTER (Diamond Brite type)
- Very rough with visible pebbles throughout = PEBBLE

Return ONLY this JSON:
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
}`,
    },
    '1.2.0': {
      version: '1.2.0',
      createdAt: new Date('2025-07-01'),
      changes: [
        'Added clarification about waterline tile vs surface',
        'Improved plaster identification criteria',
        'Added Diamond Brite as plaster variant',
        'Structured JSON response format with specific issue fields',
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
    "discoloration": "none|minor|significant",
    "etching": "none|minor|moderate|severe",
    "scaling": "none|light|moderate|heavy",
    "chipping": "none|minor|moderate|severe",
    "hollow_spots": "none|few|many"
  },
  "recommendations": ["specific maintenance suggestions"],
  "confidence": 0.85
}

Visual indicators for surface issues:
STAINS: Dark spots, rust marks, mineral deposits, organic growth
CRACKS: Visible fractures, spider web patterns, structural cracks
ROUGHNESS: Texture deviation from original smooth finish
DISCOLORATION: Color changes, fading, uneven coloration
ETCHING:
  - Appears as dull, matte patches on shiny surfaces
  - Often from chemical imbalance (low pH)
  - Surface feels rough in etched areas
  - Lost sheen compared to surrounding areas
SCALING:
  - White or gray crusty deposits
  - Calcium carbonate buildup
  - Often at waterline but can appear anywhere
  - Raised texture you can feel
CHIPPING:
  - Small pieces of surface material missing
  - Exposed substrate visible
  - Sharp or rough edges where material broke off
  - Common around fixtures or high-traffic areas
HOLLOW SPOTS:
  - May not be visually obvious in photos
  - Look for: bulging areas, cracks in circular patterns
  - Discoloration in patches suggesting delamination
  - Areas that appear "puffy" or raised

BE SPECIFIC: If you see a smooth surface with slight sparkle, it's likely Diamond Brite plaster, not tile.`,
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

Return a detailed JSON analysis.`,
    },
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

  static getChangeLog(): Array<{
    version: string;
    date: Date;
    changes: string[];
  }> {
    return this.getAllVersions().map((version) => {
      const prompt = this.PROMPTS[version];
      return {
        version: prompt.version,
        date: prompt.createdAt,
        changes: prompt.changes,
      };
    });
  }
}
