import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Copy, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useDuplicateProject } from "@/features/projects/api/use-duplicate-project";
import { useSaveAsTemplate } from "@/features/projects/api/use-save-as-template";
import type { Project } from "@/features/projects/api/use-get-projects";

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete project?",
    "This action cannot be undone. The project will be permanently deleted."
  );
  const [DuplicateDialog, confirmDuplicate] = useConfirm(
    "Duplicate project?",
    "This will create a copy of the project."
  );
  const [TemplateDialog, confirmTemplate] = useConfirm(
    "Save as template?",
    "This project will be saved as a reusable template."
  );

  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();
  const { mutate: duplicateProject, isPending: isDuplicating } = useDuplicateProject();
  const { mutate: saveAsTemplate, isPending: isSaving } = useSaveAsTemplate();

  const handleOpen = () => {
    navigate(`/editor/${project.id}`);
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (confirmed) {
      deleteProject({ id: project.id });
    }
  };

  const handleDuplicate = async () => {
    const confirmed = await confirmDuplicate();
    if (confirmed) {
      duplicateProject(project.id);
    }
  };

  const handleSaveAsTemplate = async () => {
    const confirmed = await confirmTemplate();
    if (confirmed) {
      saveAsTemplate({
        name: `${project.name} (Template)`,
        json: project.json,
        width: project.width,
        height: project.height,
        thumbnailUrl: project.thumbnailUrl || undefined,
      });
    }
  };

  const isPending = isDeleting || isDuplicating || isSaving;

  return (
    <>
      <DeleteDialog />
      <DuplicateDialog />
      <TemplateDialog />
      <Card
        className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
        onClick={handleOpen}
      >
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted">
            {project.thumbnailUrl ? (
              <img
                src={project.thumbnailUrl}
                alt={project.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate">{project.name}</h3>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(project.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isPending}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleOpen}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveAsTemplate}>
                <FileText className="mr-2 h-4 w-4" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    </>
  );
};
