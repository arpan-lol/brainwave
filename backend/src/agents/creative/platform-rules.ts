import { Platform, PlatformRules } from "../types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let PLATFORM_RULES_CACHE: Record<Platform, PlatformRules> | null = null;

function loadPlatformRules(): Record<Platform, PlatformRules> {
  if (PLATFORM_RULES_CACHE) {
    return PLATFORM_RULES_CACHE;
  }

  try {
    const configPath = join(__dirname, "../../config/platform-rules.json");
    const rawData = readFileSync(configPath, "utf-8");
    const jsonData = JSON.parse(rawData);

    const transformedRules: Record<Platform, PlatformRules> = {} as Record<Platform, PlatformRules>;

    for (const platform of ["amazon", "walmart", "flipkart"] as Platform[]) {
      const rules = jsonData[platform];
      if (!rules) continue;

      transformedRules[platform] = {
        platform,
        displayName: rules.display_name,
        requiredBgColor: rules.visual.required_bg_color,
        allowedBgColors: rules.visual.allowed_bg_colors,
        dimensions: {
          width: rules.visual.dimensions.width,
          height: rules.visual.dimensions.height,
          aspectRatio: rules.visual.dimensions.aspect_ratio,
        },
        fileSize: {
          maxMB: rules.visual.file_size.max_mb,
          minMB: rules.visual.file_size.min_mb,
        },
        fileFormats: rules.visual.file_formats,
        dpi: rules.visual.dpi,
        text: {
          maxLines: rules.text.max_lines,
          minFontSize: rules.text.min_font_size,
          maxFontSize: rules.text.max_font_size,
          allowedFonts: rules.text.allowed_fonts,
          maxCharacters: rules.text.max_characters,
          lineHeightRatio: rules.text.line_height_ratio,
          textToImageRatio: rules.text.text_to_image_ratio,
          readability: rules.text.readability,
        },
        product: {
          minCoverage: rules.product.min_coverage,
          maxCoverage: rules.product.max_coverage,
          minVisibility: rules.product.min_visibility,
          centerAlignmentTolerance: rules.product.center_alignment_tolerance,
          backgroundRemovalRequired: rules.product.background_removal_required,
          showMultipleAngles: rules.product.show_multiple_angles,
          minResolution: rules.product.min_resolution,
        },
        brand: {
          colors: rules.brand.colors,
          logoRequired: rules.brand.logo_required,
          logoMaxSizePercent: rules.brand.logo_max_size_percent,
          logoPositions: rules.brand.logo_positions,
          brandConsistencyScoreMin: rules.brand.brand_consistency_score_min,
        },
        compliance: rules.compliance,
        performance: rules.performance,
        seasonalRules: rules.seasonal_rules,
      };
    }

    PLATFORM_RULES_CACHE = transformedRules;
    return transformedRules;
  } catch (error) {
    console.error("Failed to load platform rules from JSON:", error);
    throw new Error("Platform rules configuration not found");
  }
}

export function getPlatformRules(platform: Platform): PlatformRules {
  const rules = loadPlatformRules();
  return rules[platform];
}

export function getAllPlatformRules(): Record<Platform, PlatformRules> {
  return loadPlatformRules();
}

export function reloadPlatformRules(): void {
  PLATFORM_RULES_CACHE = null;
}
