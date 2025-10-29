import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Calendar, Briefcase, TrendingUp, Bookmark, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { JobMatchExplainer } from "@/components/JobMatchExplainer";

export default function CandidateDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedExplainer, setExpandedExplainer] = useState<string | null>(null);

  const { data: candidate } = useQuery({
    queryKey: ["/api/candidate/profile"],
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/candidate/recommendations"],
  });

  const { data: stats = { applications: 0, matches: 0, avgFitScore: 0 } } = useQuery({
    queryKey: ["/api/candidate/stats"],
  });

  const saveJobMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return await apiRequest("POST", "/api/candidate/save-job", { milestoneId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/recommendations"] });
      toast({ title: "Success", description: "Job saved for later!" });
    },
  });

  const skipJobMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return await apiRequest("POST", "/api/candidate/skip-job", { milestoneId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/recommendations"] });
      toast({ title: "Job skipped", description: "We won't show this recommendation again." });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async ({ milestoneId, projectId }: { milestoneId: string; projectId: string }) => {
      return await apiRequest("POST", "/api/candidate/apply", { milestoneId, projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/stats"] });
      toast({ title: "Application submitted!", description: "The business will review your application." });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold" data-testid="candidate-dashboard-title">Candidate Portal</h1>
            </div>
            <Button 
              onClick={() => setLocation("/candidate/profile")}
              data-testid="button-manage-profile"
            >
              Manage Profile
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" data-testid="welcome-message">
            Welcome back{candidate?.name ? `, ${candidate.name}` : ''}
          </h2>
          <p className="text-muted-foreground">
            Discover projects that match your skills and expertise
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="stat-applications">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="stat-applications-value">{stats.applications}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-matches">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Matches {'>'}70%</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="stat-matches-value">{stats.matches}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-avg-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Fit Score</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="stat-avg-fit-value">{stats.avgFitScore}%</div>
            </CardContent>
          </Card>
        </div>

        {!candidate?.cvFilePath && (
          <Card className="mb-8 border-[hsl(0,84%,60%)]" data-testid="upload-cv-alert">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Upload className="w-6 h-6 text-[hsl(0,84%,60%)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Upload Your CV</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your CV to unlock AI-powered profile analysis and get personalized project recommendations.
                  </p>
                  <Button onClick={() => setLocation("/candidate/profile")} data-testid="button-upload-cv">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CV Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4">Recommended Projects</h2>
          {recommendations.length === 0 ? (
            <Card className="py-16">
              <CardContent className="text-center">
                <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground mb-6">
                  {!candidate?.cvFilePath 
                    ? "Upload your CV to receive AI-powered project recommendations based on your skills." 
                    : "We're analyzing your profile to find the best project matches. Check back soon!"}
                </p>
                {!candidate?.cvFilePath && (
                  <Button onClick={() => setLocation("/candidate/profile")} data-testid="button-upload-cv-empty">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CV
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((rec: any) => {
                const isExpanded = expandedExplainer === rec.id;
                return (
                  <Card key={rec.id} className="hover-elevate transition-all duration-150 flex flex-col" data-testid={`recommendation-${rec.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{rec.projectName}</CardTitle>
                        <Badge className="bg-[hsl(142,76%,36%)] text-white shrink-0" data-testid={`badge-fit-score-${rec.id}`}>
                          {rec.fitScore}% Fit
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col">
                      <div className="flex-1">
                        {/* Why this job? toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs hover:no-underline"
                          onClick={() => setExpandedExplainer(isExpanded ? null : rec.id)}
                          data-testid={`button-toggle-explainer-${rec.id}`}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              Hide details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              Why this job?
                            </>
                          )}
                        </Button>

                        {/* Explainer component */}
                        {isExpanded && (
                          <div className="mt-3">
                            <JobMatchExplainer 
                              fitScore={{
                                score: rec.fitScore,
                                skillOverlap: rec.skillOverlap || 0,
                                experienceMatch: rec.experienceMatch || 0,
                                softSkillRelevance: rec.softSkillRelevance || 0,
                                reasoning: rec.reasoning
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => skipJobMutation.mutate(rec.id)}
                          disabled={skipJobMutation.isPending}
                          data-testid={`button-skip-${rec.id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Skip
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => saveJobMutation.mutate(rec.id)}
                          disabled={saveJobMutation.isPending}
                          data-testid={`button-save-${rec.id}`}
                        >
                          <Bookmark className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => applyMutation.mutate({ milestoneId: rec.id, projectId: rec.projectId })}
                          disabled={applyMutation.isPending}
                          data-testid={`button-apply-${rec.id}`}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
