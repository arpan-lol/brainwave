import { Loader2 } from "lucide-react";
import { useGetTemplates } from "@/features/projects/api/use-get-templates";
import { TemplateCard } from "./template-card";

export const TemplatesPage = () => {
  const { data: templates, isLoading, isError } = useGetTemplates();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground mt-1">
          Start with professionally designed templates
        </p>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-muted-foreground">
          Failed to load templates. Please try again.
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No templates available. Save a project as a template to see it here!
          </p>
        </div>
      )}
    </div>
  );
};
