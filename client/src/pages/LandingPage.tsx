import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Building2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Zap,
  Brain,
  TrendingUp,
  Shield
} from "lucide-react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Matching",
      description: "Google Gemini analyzes skills and experience to generate precise fit scores between candidates and projects"
    },
    {
      icon: Zap,
      title: "Instant CV Analysis",
      description: "Automatic parsing and skill extraction from CVs in seconds, creating comprehensive talent profiles"
    },
    {
      icon: TrendingUp,
      title: "Real-Time Tracking",
      description: "Jira integration monitors project progress and predicts delays before they impact delivery"
    },
    {
      icon: Shield,
      title: "Automated Backup",
      description: "AI detects risks and activates backup candidates automatically to ensure project continuity"
    }
  ];

  const workflows = [
    {
      number: "01",
      title: "Talent Pool Automation",
      description: "Candidates sign up, upload CVs, and AI extracts skills, experience, and domain expertise automatically",
      steps: ["CV Upload", "AI Analysis", "Skill Extraction", "Profile Creation"]
    },
    {
      number: "02",
      title: "Intelligent Matching",
      description: "Businesses create projects, AI generates skill maps, and ranks candidates by comprehensive fit scores",
      steps: ["Project Setup", "Skill Mapping", "Fit Calculation", "Candidate Ranking"]
    },
    {
      number: "03",
      title: "Project Continuity",
      description: "System monitors Jira progress, detects delays, predicts risks, and activates backup talent seamlessly",
      steps: ["Jira Sync", "Delay Detection", "Risk Prediction", "Backup Activation"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold" data-testid="app-title">
                AI Workforce OS
              </h1>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/business")}
                data-testid="button-business-portal"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Business
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white mb-8">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Powered by Google Gemini AI</span>
            </div>
            
            <h2 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6" data-testid="landing-title">
              Intelligent Talent Matching
              <span className="block mt-2">For Modern Teams</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              AI-powered workforce operating system that automates talent matching, 
              predicts project risks, and ensures continuity with real-time Jira integration
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="group"
                onClick={() => setLocation("/business")}
                data-testid="button-hero-business"
              >
                Start as Business
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setLocation("/candidate")}
                data-testid="button-hero-candidate"
              >
                Join as Candidate
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>AI Skill Extraction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>0-100 Fit Scores</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Automatic Risk Detection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">
              Everything You Need for Workforce Automation
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for businesses managing complex projects and candidates seeking the perfect match
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate transition-all duration-150">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">
              How It Works
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three automated workflows powered by Google Gemini AI and Jira integration
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {workflows.map((workflow, index) => (
              <div key={index} className="relative">
                <div className="mb-6">
                  <div className="text-5xl font-bold text-muted-foreground/20 mb-4">
                    {workflow.number}
                  </div>
                  <h4 className="text-xl font-semibold mb-2">{workflow.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{workflow.description}</p>
                </div>

                <div className="space-y-2">
                  {workflow.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-black" />
                      </div>
                      <span className="text-sm font-medium">{step}</span>
                    </div>
                  ))}
                </div>

                {index < workflows.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal CTAs */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card 
              className="hover-elevate transition-all duration-150 cursor-pointer border-2" 
              onClick={() => setLocation("/business")} 
              data-testid="card-business"
            >
              <CardContent className="p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Business Portal</h3>
                    <p className="text-sm text-muted-foreground">For hiring teams</p>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Create projects with AI-generated skill maps</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">View candidates ranked by fit scores (0-100)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Monitor risks and activate backup talent</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Import projects directly from Jira</span>
                  </li>
                </ul>

                <Button className="w-full group" size="lg" data-testid="button-enter-business">
                  Enter Business Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate transition-all duration-150 cursor-pointer border-2" 
              onClick={() => setLocation("/candidate")} 
              data-testid="card-candidate"
            >
              <CardContent className="p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Candidate Portal</h3>
                    <p className="text-sm text-muted-foreground">For professionals</p>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Upload CV for instant AI skill extraction</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Browse projects matched to your expertise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">See fit scores for every opportunity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Declare availability and get matched</span>
                  </li>
                </ul>

                <Button className="w-full group" size="lg" data-testid="button-enter-candidate">
                  Enter Candidate Portal
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Automated Matching</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0-100</div>
              <div className="text-sm text-muted-foreground">Fit Score Range</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">Real-time</div>
              <div className="text-sm text-muted-foreground">Risk Detection</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">AI</div>
              <div className="text-sm text-muted-foreground">Powered Analysis</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">AI Workforce OS</span>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-left">
              Powered by Google Gemini AI & Jira Integration
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
