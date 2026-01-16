import { Platform, PlatformRules } from "../types.js";

// Platform-specific design rules database
const PLATFORM_RULES: Record<Platform, PlatformRules> = {
  amazon: {
    platform: "amazon",
    requiredBgColor: "#FFFFFF",
    dimensions: {
      width: 1200,
      height: 628,
    },
    fileSize: {
      maxMB: 5,
    },
    text: {
      maxLines: 3,
      minFontSize: 14,
      allowedFonts: ["Arial", "Helvetica", "Amazon Ember"],
    },
    product: {
      minCoverage: 60,
      maxCoverage: 80,
    },
    brandColors: ["#FF9900", "#146EB4"],
  },
  walmart: {
    platform: "walmart",
    requiredBgColor: "#FFFFFF",
    dimensions: {
      width: 1200,
      height: 627,
    },
    fileSize: {
      maxMB: 5,
    },
    text: {
      maxLines: 4,
      minFontSize: 12,
      allowedFonts: ["Bogle", "Arial", "Helvetica"],
    },
    product: {
      minCoverage: 65,
      maxCoverage: 85,
    },
    brandColors: ["#0071CE", "#FFC220"],
  },
  flipkart: {
    platform: "flipkart",
    requiredBgColor: "#FFFFFF",
    dimensions: {
      width: 1200,
      height: 630,
    },
    fileSize: {
      maxMB: 4,
    },
    text: {
      maxLines: 3,
      minFontSize: 14,
      allowedFonts: ["flipkart Modern", "Arial", "Helvetica"],
    },
    product: {
      minCoverage: 60,
      maxCoverage: 75,
    },
    brandColors: ["#00539F", "#E32526"],
  },
};

export function getPlatformRules(platform: Platform): PlatformRules {
  return PLATFORM_RULES[platform];
}

export function getAllPlatformRules(): Record<Platform, PlatformRules> {
  return PLATFORM_RULES;
}
