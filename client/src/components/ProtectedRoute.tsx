import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAuthenticated, isBusinessUser } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBusiness?: boolean;
}

export function ProtectedRoute({ children, requireBusiness = false }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
      return;
    }

    if (requireBusiness && !isBusinessUser()) {
      setLocation("/candidate/dashboard");
      return;
    }
  }, [setLocation, requireBusiness]);

  if (!isAuthenticated()) {
    return null;
  }

  if (requireBusiness && !isBusinessUser()) {
    return null;
  }

  return <>{children}</>;
}
