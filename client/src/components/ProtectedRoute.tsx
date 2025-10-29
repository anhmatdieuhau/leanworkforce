import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBusiness?: boolean;
  requireCandidate?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireBusiness = false,
  requireCandidate = false 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      // Not logged in → Redirect to home or appropriate login
      const loginPath = requireBusiness ? "/business-login" : 
                       requireCandidate ? "/candidate-login" : "/";
      setLocation(loginPath);
      return;
    }

    if (!isLoading && user) {
      // Business route but wrong role
      if (requireBusiness && user.role !== "business") {
        const dashboardPath = user.role === "candidate" ? "/candidate/dashboard" : "/";
        setLocation(dashboardPath);
        return;
      }

      // Candidate route but wrong role
      if (requireCandidate && user.role !== "candidate") {
        const dashboardPath = user.role === "business" ? "/business" : "/";
        setLocation(dashboardPath);
        return;
      }
    }
  }, [user, isLoading, setLocation, requireBusiness, requireCandidate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Block wrong role
  if (requireBusiness && user.role !== "business") {
    return null;
  }

  if (requireCandidate && user.role !== "candidate") {
    return null;
  }

  return <>{children}</>;
}
