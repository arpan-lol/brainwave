import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormatModal } from "@/components/format-modal";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { ProjectsSection } from "./projects-section";

export const HomePage = () => {
  const navigate = useNavigate();
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const { mutate: createProject, isPending } = useCreateProject();

  const handleCreateProject = (width: number, height: number) => {
    createProject(
      { name: "Untitled Design", width, height },
      {
        onSuccess: (project: any) => {
          navigate(`/editor/${project.id}`);
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to <span className="text-primary">Varnish</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Create stunning designs with AI-powered tools
          </p>
        </div>
        <Button
          onClick={() => setIsFormatModalOpen(true)}
          disabled={isPending}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Create New Design
        </Button>
      </div>

      {/* Quick Start Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI-Powered Design
            </CardTitle>
            <CardDescription>
              Let AI help you create professional designs in seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsFormatModalOpen(true)}
            >
              Get Started
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📐 Templates
            </CardTitle>
            <CardDescription>
              Start with professionally designed templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/templates")}
            >
              Browse Templates
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📁 Your Projects
            </CardTitle>
            <CardDescription>
              Continue working on your existing designs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/projects")}
            >
              View Projects
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects Section */}
      <ProjectsSection limit={6} showViewAll />

      {/* Format Selection Modal */}
      <FormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        onSelect={handleCreateProject}
      />
    </div>
  );
};
