import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBusiness?: boolean;
}

export function ProtectedRoute({ children, requireBusiness = false }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
      return;
    }

    if (!isLoading && requireBusiness && user?.role !== "business") {
      setLocation("/candidate/dashboard");
      return;
    }
  }, [user, isLoading, setLocation, requireBusiness]);

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

  if (requireBusiness && user.role !== "business") {
    return null;
  }

  return <>{children}</>;
}
