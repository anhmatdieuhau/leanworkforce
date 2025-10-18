import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "@/components/ProjectCard";
import { Plus, FolderKanban, Users, TrendingUp, AlertTriangle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function BusinessDashboard() {
  const [, setLocation] = useLocation();

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: stats = { totalProjects: 0, totalCandidates: 0, avgFitScore: 0, riskAlerts: 0 } } = useQuery({
    queryKey: ["/api/business/stats"],
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
              <h1 className="text-2xl font-bold" data-testid="business-dashboard-title">Business Portal</h1>
            </div>
            <Button 
              onClick={() => setLocation("/business/projects/new")}
              data-testid="button-new-project"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-projects">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                <FolderKanban className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="stat-projects-value">{stats.totalProjects}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-candidates">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Candidates</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="stat-candidates-value">{stats.totalCandidates}</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-fit-score">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Fit Score</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="stat-fit-score-value">{stats.avgFitScore}%</div>
            </CardContent>
          </Card>

          <Card data-testid="stat-risk-alerts">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Risk Alerts</CardTitle>
                <AlertTriangle className="w-4 h-4 text-[hsl(0,84%,60%)]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[hsl(0,84%,60%)]" data-testid="stat-risk-alerts-value">
                {stats.riskAlerts}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Your Projects</h2>
          {projects.length === 0 ? (
            <Card className="py-16">
              <CardContent className="text-center">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first project to start matching candidates with AI-powered skill mapping.
                </p>
                <Button onClick={() => setLocation("/business/projects/new")} data-testid="button-create-first-project">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onViewDetails={(id) => setLocation(`/business/projects/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
