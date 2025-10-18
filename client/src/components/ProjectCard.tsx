import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, AlertTriangle } from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project & { milestoneCount?: number; riskCount?: number };
  onViewDetails: (id: string) => void;
}

export function ProjectCard({ project, onViewDetails }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-foreground text-background";
      case "completed": return "bg-[hsl(142,76%,36%)] text-white";
      case "on-hold": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-foreground";
    }
  };

  return (
    <Card className="hover-elevate transition-all duration-150" data-testid={`project-card-${project.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold truncate" data-testid={`project-name-${project.id}`}>
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>
          </div>
          <Badge className={`${getStatusColor(project.status)} shrink-0`} data-testid={`project-status-${project.id}`}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Milestones: </span>
            <span className="font-medium" data-testid={`project-milestone-count-${project.id}`}>
              {project.milestoneCount || 0}
            </span>
          </div>
          {project.riskCount !== undefined && project.riskCount > 0 && (
            <div className="flex items-center gap-1 text-[hsl(0,84%,60%)]">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium" data-testid={`project-risk-count-${project.id}`}>
                {project.riskCount} Risk{project.riskCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          className="w-full justify-between group" 
          onClick={() => onViewDetails(project.id)}
          data-testid={`button-view-project-${project.id}`}
        >
          View Details
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
}
