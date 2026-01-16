import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  validateCanvas,
  requestAutoFix,
  type ValidationRequest,
  type ValidationResponse,
  type AutoFixRequest,
  type AutoFixResponse,
} from "@/lib/api-client";
import { designAPI, Platform } from "@/services/designAPI";
import { fabric } from "fabric";

interface ComplianceCheckOptions {
  canvas: fabric.Canvas | null;
  platform: Platform;
}

export const useUnifiedComplianceCheck = () => {
  return useMutation({
    mutationFn: async ({ canvas, platform }: ComplianceCheckOptions) => {
      if (!canvas) throw new Error("No canvas available");
      
      const canvasState = designAPI.fabricCanvasToState(canvas);
      const response = await designAPI.validateCanvas(canvasState, platform);
      
      if (!response.success) {
        throw new Error("Validation failed");
      }
      
      return response;
    },
    onSuccess: (data) => {
      const validation = data.data.validation;
      if (validation) {
        if (validation.isCompliant) {
          toast.success("Design passes all compliance checks!");
        } else {
          const violations = validation.violations.length;
          const warnings = validation.warnings.length;
          if (violations > 0) {
            toast.error(`Found ${violations} critical violations`);
          } else if (warnings > 0) {
            toast.warning(`Found ${warnings} warnings`);
          }
        }
      }
    },
    onError: (error) => {
      console.error("Compliance check error:", error);
      toast.error(error instanceof Error ? error.message : "Compliance check failed");
    },
  });
};

export const useValidateCanvas = () => {
  return useMutation<ValidationResponse | undefined, Error, ValidationRequest>({
    mutationFn: async (request) => {
      const result = await validateCanvas(request);
      if (!result.success) {
        throw new Error(result.error || "Validation failed");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.compliant) {
        toast.success("Canvas is compliant! ✓");
      } else {
        const issueCount = data?.issues?.length || 0;
        toast.warning(`Found ${issueCount} issue${issueCount !== 1 ? 's' : ''}`);
      }
    },
    onError: (error) => {
      console.error("Validation error:", error);
      toast.error("Failed to validate canvas");
    },
  });
};

export const useAutoFix = () => {
  return useMutation<AutoFixResponse | undefined, Error, AutoFixRequest>({
    mutationFn: async (request) => {
      const result = await requestAutoFix(request);
      if (!result.success) {
        throw new Error(result.error || "Auto-fix failed");
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.fixes_applied?.length) {
        toast.success(`Applied ${data.fixes_applied.length} fixes`);
      }
    },
    onError: (error) => {
      console.error("Auto-fix error:", error);
      toast.error("Failed to auto-fix issues");
    },
  });
};
