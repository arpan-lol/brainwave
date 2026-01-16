import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectCard } from "./project-card";

interface ProjectsSectionProps {
  limit?: number;
  showViewAll?: boolean;
}

export const ProjectsSection = ({
  limit = 12,
  showViewAll = false,
}: ProjectsSectionProps) => {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetProjects();

  const projects = data?.pages.flatMap((page) => page.data) ?? [];
  const displayProjects = limit ? projects.slice(0, limit) : projects;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Projects</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Projects</h2>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Failed to load projects. Please try again.
        </div>
      </div>
    );
  }

  if (displayProjects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Projects</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No projects yet. Create your first design!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Recent Projects</h2>
        {showViewAll && projects.length > limit && (
          <Button
            variant="ghost"
            className="gap-1"
            onClick={() => navigate("/projects")}
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      {!showViewAll && hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
