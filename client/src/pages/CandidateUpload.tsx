import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isAuthenticated } from "@/lib/auth";

type UploadState = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'complete' | 'error';

export default function CandidateUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
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

              {!isLoggedIn && (
                <div className="bg-muted/50 rounded-md p-4 text-sm text-center">
                  <p className="text-muted-foreground">
                    After uploading, you'll be prompted to login to view your matches
                  </p>
                </div>
              )}
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
                  {isLoggedIn 
                    ? "Redirecting to your dashboard..."
                    : "Please login to view your job matches"}
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

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              Back to Home
            </Button>
            {!isLoggedIn && uploadState === 'idle' && (
              <Button
                variant="ghost"
                onClick={() => setLocation('/login')}
                data-testid="button-login"
              >
                Already have an account?
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
