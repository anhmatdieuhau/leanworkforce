import { apiRequest } from "./queryClient";

interface User {
  id: string;
  email: string;
  role: 'candidate' | 'business';
}

let cachedUser: User | null | undefined = undefined;

export async function fetchSession(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    cachedUser = data.user || null;
    return cachedUser ?? null;
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return null;
  }
}

export function getCachedUser(): User | null | undefined {
  return cachedUser;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("POST", "/api/auth/logout");
    cachedUser = null;
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await fetchSession();
  return user !== null;
}

export async function isBusinessUser(): Promise<boolean> {
  const user = await fetchSession();
  return user?.role === 'business';
}

export async function isCandidateUser(): Promise<boolean> {
  const user = await fetchSession();
  return user?.role === 'candidate';
}
