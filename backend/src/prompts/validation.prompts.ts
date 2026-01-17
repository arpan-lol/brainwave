import { PlatformRules } from "../agents/types.js";

export const VALIDATION_INSTANT_PROMPT = () => `Quick validation for critical structural issues.`;

export const VALIDATION_LLM_PROMPT = (
  platform: string,
  canvasWidth: number,
  canvasHeight: number,
  elementsSummary: string,
  previousErrors: string,
  rules: PlatformRules
) => `You are an expert validation agent for retail media designs, specializing in ${platform} compliance.

Platform: ${platform}
Canvas Dimensions: ${canvasWidth}x${canvasHeight}
Elements: ${elementsSummary}

Previous Validation Errors: ${previousErrors}

Platform Rules to Validate:
1. Product Coverage: ${rules.product.minCoverage}-${rules.product.maxCoverage}% of canvas
2. Product Visibility: Minimum ${rules.product.minVisibility}% visible
3. Text Readability: Min contrast ${rules.text.readability?.minContrastRatio || 4.5}:1
4. Text Position: ${rules.text.readability?.avoidOverlappingProduct ? "Must not overlap product" : "Flexible"}
5. Brand Consistency: Min score ${rules.brand?.brandConsistencyScoreMin || 0.7}
6. Brand Colors: ${rules.brand?.colors.join(", ") || "Not specified"}
7. Logo Placement: ${rules.brand?.logoPositions?.join(", ") || "Flexible"}
8. Prohibited Content: ${rules.compliance?.prohibitedContent.join(", ") || "None"}
9. Required Disclaimers: ${rules.compliance?.requiredDisclaimers.join(", ") || "None"}
10. Accessibility: Alt text ${rules.compliance?.accessibility.altTextRequired ? "required" : "optional"}, Color-blind safe ${rules.compliance?.accessibility.colorBlindSafe ? "required" : "optional"}

Subjective Rules to Validate:
- Product prominence and visual hierarchy
- Text-product balance and harmony
- Brand color usage and consistency
- Visual appeal and professionalism
- Accessibility and readability
- Click-through zone optimization
- Seasonal appropriateness (if applicable)

Respond with JSON:
{
  "violations": [
    {
      "rule": "rule_name",
      "severity": "critical" | "high" | "medium" | "low",
      "element": "element_id (optional)",
      "message": "Detailed description of violation",
      "autoFixAvailable": true | false,
      "category": "visual" | "text" | "product" | "brand" | "compliance" | "performance"
    }
  ],
  "warnings": [...],
  "suggestions": ["List of improvement suggestions that aren't violations"]
}

IMPORTANT:
- Only report actual violations, not potential improvements (use suggestions for those)
- Be specific about which element has the issue
- Calculate approximate percentages for coverage
- Consider accessibility standards (WCAG 2.1)
- Check semantic meaning, not just structural rules
`;

export const VALIDATION_COMPREHENSIVE_PROMPT = () => `Comprehensive validation including cross-validation and deep accessibility checks.`;

