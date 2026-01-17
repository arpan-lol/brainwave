import { BrandContext } from "../agents/types.js";

export const CREATIVE_ANALYZE_PROMPT = (
  platform: string,
  elementCount: number,
  canvasWidth: number,
  canvasHeight: number,
  brandContext: BrandContext
) => `You are analyzing a retail media design canvas for ${platform}.

Canvas: ${elementCount} elements, ${canvasWidth}x${canvasHeight}
Brand Context:
- Colors in use: ${brandContext.colors.join(", ") || "none"}
- Fonts in use: ${brandContext.fonts.join(", ") || "none"}
- Current consistency score: ${brandContext.consistencyScore}

Analyze the canvas and identify:
1. Critical elements (product images, brand logos)
2. Areas for improvement
3. Brand consistency issues
4. Compliance gaps
`;

export const CREATIVE_PLAN_PROMPT = (
  platform: string,
  elementCount: number,
  canvasWidth: number,
  canvasHeight: number,
  userRequest: string,
  topRules: string[],
  brandContext: BrandContext,
  optionsCount: number
) => `You are a creative design agent for retail media, specializing in ${platform} compliance.

Platform: ${platform}
Canvas: ${elementCount} elements, ${canvasWidth}x${canvasHeight}
Request: ${userRequest}

Platform Rules Summary:
${topRules.join("\n")}

Brand Context:
- Colors: ${brandContext.colors.join(", ") || "none detected"}
- Fonts: ${brandContext.fonts.join(", ") || "none detected"}
- Brand consistency score: ${brandContext.consistencyScore.toFixed(2)}
- Brand name: ${brandContext.name || "not specified"}

Generate ${optionsCount} design option(s) as JSON. Each option must:
1. Specify exact positions (x, y) and styles for ALL elements
2. Explain compliance reasoning
3. Calculate brand consistency score
4. Estimate impact level (minor, moderate, major)
5. List preserved elements (if any)
6. Provide high confidence score (0-1)

IMPORTANT:
- Preserve existing elements when possible
- Maintain brand consistency
- Ensure all elements are positioned within canvas bounds
- Follow platform-specific guidelines
- Consider accessibility (color contrast, readability)

Respond with JSON following this schema:
{
  "options": [
    {
      "id": "option-1",
      "elements": [
        {
          "id": "elem-1",
          "type": "text" | "image" | "shape" | "background",
          "x": number,
          "y": number,
          "width": number,
          "height": number,
          "style": {
            "color": "#hex",
            "fontSize": number,
            "fontFamily": "font-name",
            "backgroundColor": "#hex"
          },
          "content": "text content",
          "src": "image url",
          "metadata": {
            "isCritical": boolean,
            "isProduct": boolean,
            "layer": number
          }
        }
      ],
      "complianceReasoning": "Detailed explanation of how this design meets platform requirements...",
      "confidence": 0.0-1.0,
      "modifications": ["List of specific changes made"],
      "brandConsistencyScore": 0.0-1.0,
      "estimatedImpact": "minor" | "moderate" | "major",
      "preservedElements": ["elem-id-1", "elem-id-2"]
    }
  ]
}
`;

export const CREATIVE_GENERATE_PROMPT = (
  platform: string,
  designOption: any
) => `Generate assets for this design option on ${platform}.

This is a placeholder for future asset generation logic.
Design Option ID: ${designOption.id}
`;

