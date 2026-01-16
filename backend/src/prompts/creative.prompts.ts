export const CREATIVE_PLAN_PROMPT = (
  platform: string,
  elementCount: number,
  canvasWidth: number,
  canvasHeight: number,
  userRequest: string,
  topRules: string[]
) => `You are a creative design agent for retail media.

Platform: ${platform}
Canvas: ${elementCount} elements, ${canvasWidth}x${canvasHeight}
Request: ${userRequest}

Platform Rules Summary:
${topRules.join("\n")}

Generate 3 design options as JSON. Each option must:
1. Specify exact positions (x, y) and styles for elements
2. Explain compliance reasoning
3. Be production-ready
4. Have a confidence score (0-1)

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
          "style": {...},
          "content": "...",
          "src": "..."
        }
      ],
      "complianceReasoning": "Why this design is compliant...",
      "confidence": 0.0-1.0,
      "modifications": ["List of changes made"]
    }
  ]
}

NOTE: For now, provide 1 option (we'll scale to 3 later). Keep it simple and focused on the user request.
`;
