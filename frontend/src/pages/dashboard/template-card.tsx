import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Project } from "@/features/projects/api/use-get-projects";

interface TemplateCardProps {
  template: Project;
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
  const navigate = useNavigate();

  const handleSelect = () => {
    // When selecting a template, create a new project from it
    // For now, just navigate to editor with the template
    navigate(`/editor/${template.id}`);
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
      onClick={handleSelect}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted">
          {template.thumbnailUrl ? (
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-primary/80 text-primary-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Use Template
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{template.name}</h3>
          <p className="text-xs text-muted-foreground">
            {template.width} × {template.height}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};
