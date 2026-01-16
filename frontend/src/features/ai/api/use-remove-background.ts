import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { removeBackground, type RemoveBgResponse } from "@/lib/api-client";

interface UseRemoveBackgroundOptions {
  onSuccess?: (base64Data: string) => void;
}

/**
 * Hook for removing background from images using the backend API
 */
export const useRemoveBackground = (options?: UseRemoveBackgroundOptions) => {
  return useMutation<RemoveBgResponse, Error, File>({
    mutationFn: async (imageFile) => {
      const result = await removeBackground(imageFile);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to remove background");
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success("Background removed successfully");
      options?.onSuccess?.(data.image_data);
    },
    onError: (error) => {
      console.error("Background removal error:", error);
      toast.error("Failed to remove background");
    },
  });
};

// Alias for compatibility
export const useRemoveBackgroundFile = useRemoveBackground;
