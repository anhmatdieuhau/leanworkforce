import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Calendar, Briefcase, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function CandidateDashboard() {
  const [, setLocation] = useLocation();

  const { data: candidate } = useQuery({
    queryKey: ["/api/candidate/profile"],
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/candidate/recommendations"],
  });

  const { data: stats = { applications: 0, matches: 0, avgFitScore: 0 } } = useQuery({
    queryKey: ["/api/candidate/stats"],
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
              {recommendations.map((rec: any) => (
                <Card key={rec.id} className="hover-elevate transition-all duration-150" data-testid={`recommendation-${rec.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{rec.projectName}</CardTitle>
                      <Badge className="bg-[hsl(142,76%,36%)] text-white shrink-0">
                        {rec.fitScore}% Fit
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {rec.milestoneName}: {rec.description}
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/candidate/opportunities/${rec.id}`)}
                      data-testid={`button-view-opportunity-${rec.id}`}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
