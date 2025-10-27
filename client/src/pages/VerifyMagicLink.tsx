import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function VerifyMagicLink() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [redirectPath, setRedirectPath] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      // Get token from URL query params
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setError("No token provided in the link.");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-magic-link?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Verification failed");
        }

        // Success! Store user data in localStorage (simple session management)
        localStorage.setItem("user", JSON.stringify(data.user));
        
        setStatus("success");
        setRedirectPath(data.redirectTo);

        // Auto-redirect after 2 seconds
        setTimeout(() => {
          setLocation(data.redirectTo);
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Something went wrong. Please try again.");
      }
    };

    verifyToken();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Lean Workforce</h1>
          <p className="text-muted-foreground">Verifying your login link...</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {status === "loading" && (
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            )}
            {status === "error" && (
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            <CardTitle data-testid="status-title">
              {status === "loading" && "Verifying Link..."}
              {status === "success" && "Login Successful!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "loading" && (
              <p className="text-muted-foreground">
                Please wait while we verify your login link...
              </p>
            )}

            {status === "success" && (
              <>
                <p className="text-muted-foreground" data-testid="success-message">
                  You're being redirected to your dashboard...
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to {redirectPath}
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium text-destructive mb-1">Error</p>
                      <p className="text-sm text-destructive/90" data-testid="error-message">{error}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/login")}
                    data-testid="button-request-new-link"
                  >
                    Request a New Link
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    {error.includes("expired") && "The link may have expired (10 minute limit)"}
                    {error.includes("used") && "Each link can only be used once"}
                    {error.includes("Invalid") && "The link may be incorrect or tampered with"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
