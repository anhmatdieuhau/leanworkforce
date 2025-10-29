import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle2, AlertCircle, Clock, User, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function CandidateLogin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isCheckingAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "candidate") {
        setLocation("/candidate/dashboard");
      } else {
        setLocation("/business");
      }
    }
  }, [user, setLocation]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render login form if user is logged in
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/request-magic-link", { 
        email,
        requestedRole: "candidate"
      });
      
      setLinkSent(true);
      setCanResend(false);
      
      let timeLeft = 30;
      setCountdown(timeLeft);
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          setCanResend(true);
          setCountdown(0);
        }
      }, 1000);

      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link.",
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to send magic link. Please try again.";
      setError(errorMsg);
      
      if (err.message?.includes("Too many requests")) {
        setCanResend(false);
        toast({
          title: "Rate limit exceeded",
          description: "Please wait before requesting another link.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setLinkSent(false);
    setError("");
    handleSubmit(new Event("submit") as any);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Lean Workforce</h1>
          <p className="text-muted-foreground">Find your next opportunity</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Candidate Login</CardTitle>
            <CardDescription>
              Enter your email to access your opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!linkSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    data-testid="input-email-candidate"
                  />
                  {error && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span data-testid="error-message">{error}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email}
                  data-testid="button-send-link-candidate"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Login Link
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  No password needed. We'll email you a secure link.
                </p>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" data-testid="success-title">Check Your Email</h3>
                  <p className="text-muted-foreground mb-4" data-testid="success-message">
                    We sent a login link to <strong>{email}</strong>
                  </p>
                  <div className="bg-muted/50 rounded-md p-4 mb-4 text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-left">
                        The link will expire in <strong>10 minutes</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-left">
                        Check your spam folder if you don't see it
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  data-testid="button-resend"
                >
                  {countdown > 0 ? (
                    <>
                      Resend in {countdown}s
                    </>
                  ) : (
                    <>
                      Resend Link
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setLinkSent(false);
                    setEmail("");
                    setError("");
                  }}
                  data-testid="button-different-email"
                >
                  Use Different Email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
