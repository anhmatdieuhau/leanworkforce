import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkflowVisualization } from "@/components/WorkflowVisualization";
import { Users, Building2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const workflows = [
    {
      title: "Talent Pool Automation",
      steps: [
        { title: "Candidate Signup", description: "Register with email" },
        { title: "CV Parsing (Gemini)", description: "AI extracts profile" },
        { title: "Skill Extraction", description: "Identify competencies" },
        { title: "Pool Save", description: "Store for matching" },
      ],
    },
    {
      title: "AI Matching",
      steps: [
        { title: "Project Creation", description: "Define requirements" },
        { title: "Skill Map AI", description: "Generate needs" },
        { title: "Fit Score Calculation", description: "Rank candidates" },
        { title: "Ranking", description: "Present matches" },
      ],
    },
    {
      title: "Continuity AI",
      steps: [
        { title: "Jira Sync", description: "Monitor progress" },
        { title: "Delay Detection", description: "Track timeline" },
        { title: "Risk Assessment", description: "Predict issues" },
        { title: "Backup Activation", description: "Auto-fill gaps" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" data-testid="app-title">AI Workforce OS</h1>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/business")}
              data-testid="button-business-portal"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Business Portal
            </Button>
            <Button 
              onClick={() => setLocation("/candidate")}
              data-testid="button-candidate-portal"
            >
              <Users className="w-4 h-4 mr-2" />
              Candidate Portal
            </Button>
          </div>
        </div>
      </header>

      <main className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" data-testid="landing-title">
            Intelligent Talent Matching & Project Continuity
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered workforce operating system using Google Gemini for intelligent skill extraction,
            candidate–project matching, and real-time risk prediction with Jira integration.
          </p>
        </div>

        <WorkflowVisualization workflows={workflows} />

        <div className="max-w-6xl mx-auto px-4 mt-16">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover-elevate transition-all duration-150 cursor-pointer" onClick={() => setLocation("/business")} data-testid="card-business">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Business Portal</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Create and manage projects, view AI-generated skill maps, rank candidates by fit score,
                  and monitor project risks with automated backup talent activation.
                </p>
                <Button className="w-full group" data-testid="button-enter-business">
                  Enter Business Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-150 cursor-pointer" onClick={() => setLocation("/candidate")} data-testid="card-candidate">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold">Candidate Portal</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Upload your CV for AI analysis, declare availability, browse recommended projects
                  with {'>'}70% fit scores, and apply to milestones matching your expertise.
                </p>
                <Button className="w-full group" data-testid="button-enter-candidate">
                  Enter Candidate Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-24 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>AI Workforce OS - Powered by Google Gemini & Jira Integration</p>
        </div>
      </footer>
    </div>
  );
}
