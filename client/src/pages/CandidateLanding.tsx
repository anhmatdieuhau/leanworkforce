import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Briefcase,
  Target,
  Zap,
  TrendingUp,
  FileText,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated } from "@/lib/auth";

type UploadState = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'complete' | 'error';

export default function CandidateLanding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showUploadSection, setShowUploadSection] = useState(false);
  const isLoggedIn = isAuthenticated();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('cv', file);

    try {
      setUploadState('uploading');
      setProgress(25);

      setTimeout(() => {
        setUploadState('parsing');
        setProgress(50);
      }, 500);

      setTimeout(() => {
        setUploadState('analyzing');
        setProgress(75);
      }, 1000);

      const res = await fetch('/api/candidate/upload-cv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }

      setProgress(100);
      setUploadState('complete');

      toast({
        title: "CV Uploaded Successfully",
        description: "Your profile has been created with AI-extracted skills",
      });

      if (isLoggedIn) {
        setTimeout(() => setLocation('/candidate/dashboard'), 1500);
      } else {
        setTimeout(() => setLocation('/login'), 2000);
      }
    } catch (error: any) {
      setUploadState('error');
      setErrorMessage(error.message || 'Upload failed');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CV",
        variant: "destructive",
      });
    }
  };

  if (isLoggedIn) {
    setLocation('/candidate/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="text-base sm:text-xl font-bold">Lean Workforce</span>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/login')}
                data-testid="button-login"
                className="text-xs sm:text-sm px-2 sm:px-4"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowUploadSection(true);
                  setTimeout(() => {
                    document.getElementById('upload-section')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }, 100);
                }}
                data-testid="button-get-started"
                className="text-xs sm:text-sm px-2.5 sm:px-4"
              >
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6" data-testid="hero-title">
              Find Projects That Match Your Skills
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 px-4 sm:px-0">
              AI-powered talent matching connects you with opportunities that fit your expertise. 
              Upload your CV and get matched with projects in seconds.
            </p>
            <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-4 sm:px-0">
              <Button 
                size="lg"
                onClick={() => {
                  setShowUploadSection(true);
                  setTimeout(() => {
                    document.getElementById('upload-section')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }, 100);
                }}
                data-testid="button-hero-cta"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Your CV
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => setLocation('/login')}
                data-testid="button-hero-login"
              >
                I Already Have an Account
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold mb-2" data-testid="stat-matches">500+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Projects Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold mb-2" data-testid="stat-ai">AI-Powered</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Smart Matching</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold mb-2" data-testid="stat-time">&lt; 60s</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Time to Match</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Workflow Visualization */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">How It Works</h2>
            <p className="text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
              Three simple steps to your next opportunity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="bg-black text-white px-4 py-2 rounded-md font-semibold text-center">
                Upload CV
              </div>
              <div className="space-y-2">
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Upload your PDF resume</span>
                  </CardContent>
                </Card>
                <div className="h-2 w-px bg-border mx-auto" />
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Brain className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">AI extracts your skills</span>
                  </CardContent>
                </Card>
                <div className="h-2 w-px bg-border mx-auto" />
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Profile created instantly</span>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="bg-black text-white px-4 py-2 rounded-md font-semibold text-center">
                Get Matched
              </div>
              <div className="space-y-2">
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Target className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">AI finds relevant projects</span>
                  </CardContent>
                </Card>
                <div className="h-2 w-px bg-border mx-auto" />
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Calculate fit scores</span>
                  </CardContent>
                </Card>
                <div className="h-2 w-px bg-border mx-auto" />
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Ranked by relevance</span>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="bg-black text-white px-4 py-2 rounded-md font-semibold text-center">
                Apply & Win
              </div>
              <div className="space-y-2">
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Review opportunities</span>
                  </CardContent>
                </Card>
                <div className="h-2 w-px bg-border mx-auto" />
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">One-click apply</span>
                  </CardContent>
                </Card>
                <div className="h-2 w-px bg-border mx-auto" />
                <Card className="hover-elevate">
                  <CardContent className="p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Track your applications</span>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Why Candidates Choose Us</h2>
            <p className="text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
              Modern talent matching powered by AI
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <CardTitle>AI Skill Extraction</CardTitle>
                <CardDescription>
                  Google Gemini AI automatically identifies your skills, experience, and expertise from your CV
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Smart Matching</CardTitle>
                <CardDescription>
                  Get matched with projects based on skill overlap, experience level, and soft skill relevance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-black rounded-md flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Instant Results</CardTitle>
                <CardDescription>
                  See fit scores (0-100%) for every project and understand why you're a good match
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      {showUploadSection && (
        <section id="upload-section" className="py-16 bg-muted/30 scroll-mt-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl" data-testid="upload-title">
                  Upload Your CV
                </CardTitle>
                <CardDescription>
                  Get matched with projects that fit your skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {uploadState === 'idle' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-md p-12 text-center hover-elevate active-elevate-2 transition-colors">
                      <input
                        type="file"
                        id="cv-upload"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-cv-file"
                      />
                      <label
                        htmlFor="cv-upload"
                        className="cursor-pointer flex flex-col items-center gap-3"
                      >
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Click to upload CV</p>
                          <p className="text-sm text-muted-foreground">PDF format only</p>
                        </div>
                      </label>
                    </div>

                    <div className="bg-muted/50 rounded-md p-4 text-sm text-center">
                      <p className="text-muted-foreground">
                        After uploading, you'll be prompted to login to view your matches
                      </p>
                    </div>
                  </div>
                )}

                {(uploadState === 'uploading' || uploadState === 'parsing' || uploadState === 'analyzing') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="font-medium">
                        {uploadState === 'uploading' && 'Uploading CV...'}
                        {uploadState === 'parsing' && 'Parsing document...'}
                        {uploadState === 'analyzing' && 'AI analyzing skills...'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-black h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                        data-testid="progress-bar"
                      />
                    </div>
                  </div>
                )}

                {uploadState === 'complete' && (
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" data-testid="icon-success" />
                    <div>
                      <h3 className="text-xl font-semibold" data-testid="success-title">
                        CV Uploaded Successfully!
                      </h3>
                      <p className="text-muted-foreground">
                        Please login to view your job matches
                      </p>
                    </div>
                  </div>
                )}

                {uploadState === 'error' && (
                  <div className="text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto" data-testid="icon-error" />
                    <div>
                      <h3 className="text-xl font-semibold">Upload Failed</h3>
                      <p className="text-muted-foreground" data-testid="error-message">
                        {errorMessage}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setUploadState('idle');
                        setProgress(0);
                        setErrorMessage('');
                      }}
                      data-testid="button-try-again"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Opportunity?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of talented professionals getting matched with their ideal projects
          </p>
          <Button 
            size="lg"
            onClick={() => {
              setShowUploadSection(true);
              setTimeout(() => {
                document.getElementById('upload-section')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }, 100);
            }}
            data-testid="button-cta-upload"
          >
            <Upload className="w-5 h-5 mr-2" />
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Powered by LeanfounderSpace</span>
            </div>
            <div>© 2025 Lean Workforce. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
