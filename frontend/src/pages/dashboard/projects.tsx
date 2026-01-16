import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormatModal } from "@/components/format-modal";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { ProjectsSection } from "./projects-section";

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const { mutate: createProject, isPending } = useCreateProject();

  const handleCreateProject = (width: number, height: number) => {
    createProject(
      { name: "Untitled Design", width, height },
      {
        onSuccess: (response) => {
          navigate(`/editor/${response.data.id}`);
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize all your designs
          </p>
        </div>
        <Button
          onClick={() => setIsFormatModalOpen(true)}
          disabled={isPending}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <ProjectsSection />

      {/* Format Selection Modal */}
      <FormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        onSelect={handleCreateProject}
      />
    </div>
  );
};
