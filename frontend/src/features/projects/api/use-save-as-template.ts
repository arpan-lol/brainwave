import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "./use-get-projects";
import { getProjectsFromStorage, saveProjectsToStorage } from "./use-get-projects";

interface RequestType {
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
}

interface ResponseType {
  data: Project;
}

export const useSaveAsTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ name, json, width, height, thumbnailUrl }) => {
      const projects = getProjectsFromStorage();

      const newTemplate: Project = {
        id: crypto.randomUUID(),
        name,
        json,
        width,
        height,
        userId: "anonymous",
        isTemplate: true,
        isPro: false,
        thumbnailUrl: thumbnailUrl || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      projects.push(newTemplate);
      saveProjectsToStorage(projects);

      return { data: newTemplate };
    },
    onSuccess: () => {
      toast.success("Saved as template!");
      queryClient.invalidateQueries({ queryKey: ["templates"], refetchType: "all" });
    },
    onError: () => {
      toast.error("Failed to save as template.");
    },
  });

  return mutation;
};
