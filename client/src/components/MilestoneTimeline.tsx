import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { Milestone } from "@shared/schema";

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onMilestoneClick?: (id: string) => void;
}

export function MilestoneTimeline({ milestones, onMilestoneClick }: MilestoneTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-[hsl(142,76%,36%)]" />;
      case "in-progress": return <Clock className="w-4 h-4 text-foreground" />;
      case "delayed": return <AlertTriangle className="w-4 h-4 text-[hsl(0,84%,60%)]" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-border" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[hsl(142,76%,36%)] text-white";
      case "in-progress": return "bg-foreground text-background";
      case "delayed": return "bg-[hsl(0,84%,60%)] text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {milestones.map((milestone, idx) => (
        <Card 
          key={milestone.id} 
          className={`hover-elevate transition-all duration-150 ${onMilestoneClick ? 'cursor-pointer' : ''}`}
          onClick={() => onMilestoneClick?.(milestone.id)}
          data-testid={`milestone-card-${milestone.id}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(milestone.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold" data-testid={`milestone-name-${milestone.id}`}>
                    {milestone.name}
                  </h3>
                  <Badge className={`${getStatusColor(milestone.status)} text-xs`} data-testid={`milestone-status-${milestone.id}`}>
                    {milestone.status}
                  </Badge>
                  {milestone.riskLevel === "high" && (
                    <Badge className="bg-[hsl(0,84%,60%)] text-white text-xs" data-testid={`milestone-risk-${milestone.id}`}>
                      High Risk
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {milestone.description}
                </p>
              </div>
            </div>
          </CardHeader>
          {milestone.estimatedHours && (
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estimated: </span>
                  <span className="font-medium">{milestone.estimatedHours}h</span>
                </div>
                {milestone.delayPercentage !== null && milestone.delayPercentage > 0 && (
                  <div className="text-[hsl(0,84%,60%)]">
                    <span className="font-medium">+{milestone.delayPercentage}% delayed</span>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
