import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateImage, type ImageGenerationRequest, type ImageGenerationResponse } from "@/lib/api-client";

/**
 * Hook for generating design variations using AI
 */
export const useVariations = () => {
  return useMutation<ImageGenerationResponse | undefined, Error, ImageGenerationRequest>({
    mutationFn: async (request) => {
      const result = await generateImage(request);
      if (!result.success) {
        throw new Error(result.error || "Failed to generate variations");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        toast.success("Variation generated successfully");
      }
    },
    onError: (error) => {
      console.error("Variation generation error:", error);
      toast.error("Failed to generate variation");
    },
  });
};

// Alias for compatibility
export const useGenerateVariations = useVariations;
