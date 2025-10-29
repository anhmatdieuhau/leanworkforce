import { useQuery } from "@tanstack/react-query";
import { fetchSession } from "@/lib/auth";

export function useAuth() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  return {
    user: data ?? null,
    isLoading,
    error,
    isAuthenticated: !!data,
    isBusinessUser: data?.role === "business",
    isCandidateUser: data?.role === "candidate",
    refetch,
  };
}
