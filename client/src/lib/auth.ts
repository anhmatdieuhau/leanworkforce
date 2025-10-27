interface User {
  id: string;
  email: string;
  role: 'candidate' | 'business';
  name?: string;
}

export function getUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}

export function isBusinessUser(): boolean {
  const user = getUser();
  return user?.role === 'business';
}

export function isCandidateUser(): boolean {
  const user = getUser();
  return user?.role === 'candidate';
}
