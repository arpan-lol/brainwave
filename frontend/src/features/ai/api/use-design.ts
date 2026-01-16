import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { designAPI, DesignRequest, DesignResponse, Platform, CanvasState } from "@/services/designAPI";

export const useDesignRequest = () => {
  return useMutation<DesignResponse, Error, DesignRequest>({
    mutationFn: async (request) => {
      return designAPI.executeDesignRequest(request);
    },
    onSuccess: (data) => {
      if (data.success) {
        const category = data.data.routing.category;
        if (category === 'creative' && data.data.creative) {
          toast.success(`Generated ${data.data.creative.designOptions.length} design options`);
        } else if (category === 'validate' && data.data.validation) {
          if (data.data.validation.isCompliant) {
            toast.success("Design is compliant!");
          } else {
            toast.warning(`Found ${data.data.validation.violations.length} compliance issues`);
          }
        }
      }
    },
    onError: (error) => {
      console.error("Design request error:", error);
      toast.error(error.message || "Failed to process design request");
    },
  });
};

export const useValidateDesign = () => {
  return useMutation<DesignResponse, Error, { canvasState: CanvasState; platform: Platform }>({
    mutationFn: async ({ canvasState, platform }) => {
      return designAPI.validateCanvas(canvasState, platform);
    },
    onSuccess: (data) => {
      if (data.success && data.data.validation) {
        if (data.data.validation.isCompliant) {
          toast.success("Design passes all compliance checks!");
        } else {
          const violations = data.data.validation.violations.length;
          const warnings = data.data.validation.warnings.length;
          toast.warning(`Found ${violations} violations and ${warnings} warnings`);
        }
      }
    },
    onError: (error) => {
      console.error("Validation error:", error);
      toast.error("Failed to validate design");
    },
  });
};
