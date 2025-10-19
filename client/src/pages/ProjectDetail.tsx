import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import { CandidateCard } from "@/components/CandidateCard";
import { GroupedTasksView } from "@/components/GroupedTasksView";
import { ArrowLeft, AlertTriangle, Users, Target, RefreshCw, List } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Project, Milestone, Candidate } from "@shared/schema";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProjectDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const projectId = params.id;
  const { toast } = useToast();
  const [groupBy, setGroupBy] = useState<"epic" | "sprint" | "none">("sprint");
  const [viewMode, setViewMode] = useState<"timeline" | "grouped">("grouped");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["/api/projects", projectId, "milestones"],
  });

  const { data: topCandidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/projects", projectId, "candidates"],
  });

  const { data: riskAlerts = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", projectId, "risks"],
  });

  const syncJiraMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/sync-jira`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: data.message || `Successfully synced ${data.synced} tasks from Jira`,
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "risks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync tasks from Jira",
        variant: "destructive",
      });
    },
  });

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Project not found</div>
          <Button onClick={() => setLocation("/business")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-foreground text-background";
      case "completed": return "bg-[hsl(142,76%,36%)] text-white";
      case "on-hold": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/business")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold" data-testid="project-name">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
            {project.jiraProjectKey && (
              <Button 
                variant="outline"
                onClick={() => syncJiraMutation.mutate()}
                disabled={syncJiraMutation.isPending}
                data-testid="button-sync-jira"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncJiraMutation.isPending ? 'animate-spin' : ''}`} />
                {syncJiraMutation.isPending ? "Syncing..." : "Sync Tasks from Jira"}
              </Button>
            )}
            <Badge className={getStatusColor(project.status)} data-testid="project-status">
              {project.status}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {riskAlerts.length > 0 && (
          <Card className="mb-6 border-[hsl(0,84%,60%)]" data-testid="risk-alerts-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[hsl(0,84%,60%)]" />
                <CardTitle className="text-lg">Risk Alerts ({riskAlerts.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskAlerts.map((alert: any) => (
                  <div key={alert.id} className="p-3 border border-border rounded-md" data-testid={`risk-alert-${alert.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium">{alert.milestoneName}</div>
                        <div className="text-sm text-muted-foreground">
                          Delay: {alert.delayPercentage}% | Risk Level: {alert.riskLevel}
                        </div>
                      </div>
                      <Badge className="bg-[hsl(0,84%,60%)] text-white shrink-0">
                        {alert.riskLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="milestones" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="milestones" data-testid="tab-milestones">
              <Target className="w-4 h-4 mr-2" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="candidates" data-testid="tab-candidates">
              <Users className="w-4 h-4 mr-2" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="milestones" className="space-y-4">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Project Tasks</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "timeline" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("timeline")}
                    data-testid="button-view-timeline"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Timeline
                  </Button>
                  <Button
                    variant={viewMode === "grouped" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grouped")}
                    data-testid="button-view-grouped"
                  >
                    <List className="w-4 h-4 mr-2" />
                    Grouped
                  </Button>
                </div>
                {viewMode === "grouped" && (
                  <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                    <SelectTrigger className="w-[150px]" data-testid="select-group-by">
                      <SelectValue placeholder="Group by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="epic">By Epic</SelectItem>
                      <SelectItem value="sprint">By Sprint</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <div className="text-sm text-muted-foreground">
                  {milestones.length} task{milestones.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            {milestones.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center text-muted-foreground">
                  No tasks defined yet
                </CardContent>
              </Card>
            ) : viewMode === "timeline" ? (
              <MilestoneTimeline milestones={milestones} />
            ) : (
              <GroupedTasksView milestones={milestones} groupBy={groupBy} />
            )}
          </TabsContent>

          <TabsContent value="candidates" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Top Matched Candidates</h2>
              <div className="text-sm text-muted-foreground">
                {topCandidates.length} candidate{topCandidates.length !== 1 ? 's' : ''}
              </div>
            </div>
            {topCandidates.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No candidates matched yet</h3>
                  <p className="text-muted-foreground">
                    The AI will automatically match candidates once they register and upload their CVs.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topCandidates.map((candidate: any) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    fitScore={candidate.fitScore}
                    showFitScore={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                  <p className="text-sm">{project.description}</p>
                </div>
                {project.jiraProjectKey && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Jira Project Key</div>
                    <p className="text-sm font-mono">{project.jiraProjectKey}</p>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                  <p className="text-sm">{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
