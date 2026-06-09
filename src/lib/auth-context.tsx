'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { apiFetch } from '@/lib/api-client';

// Map our backend AppRole to the UI's UserRole
export type UserRole = 'super_admin' | 'admin' | 'agronomist' | 'farmer' | 'ops' | 'buyer';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole; // UI expects a single role currently
  roles?: UserRole[]; // Real backend provides multiple
  organizationId: string | null;
  organizationSlug: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, orgSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Preparing your dashboard...");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    try {
      setLoadingMessage("Signing you out safely...");
      setIsActionLoading(true);
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('farmicle_user');
      }
      window.location.href = user?.organizationSlug ? `/org/${user.organizationSlug}` : '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = user?.organizationSlug ? `/org/${user.organizationSlug}` : '/login';
    } finally {
      setIsActionLoading(false);
    }
  }, [user?.organizationSlug]);

  // 1. Session Validation on Mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        setLoadingMessage("Verifying your session...");
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const backendUser = data.user;
          const newUser: User = {
            id: backendUser.id,
            email: backendUser.email,
            name: backendUser.name,
            role: backendUser.roles[0] as UserRole,
            roles: backendUser.roles,
            organizationId: backendUser.organizationId,
            organizationSlug: backendUser.organizationSlug,
          };
          setUser(newUser);
        } else {
          // If session is invalid, ensure user is null
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsInitialLoading(false);
      }
    };

    validateSession();
  }, []);

  // 2. Inactivity Timeout Logic
  const resetInactivityTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (user) {
      timeoutRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, logout]);

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetInactivityTimeout();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize the timeout
    resetInactivityTimeout();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetInactivityTimeout]);

  const login = async (email: string, password: string, orgSlug?: string): Promise<void> => {
    setLoadingMessage("Securing your access...");
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgSlug }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : null;
      const rawText = data == null ? await res.text().catch(() => "") : "";

      if (!res.ok) {
        const safeText =
          contentType.includes("text/html") || rawText.includes("<html") || rawText.includes("<!DOCTYPE")
            ? "Login failed due to a server error. Check the server logs."
            : rawText;
        const error = new Error((data as any)?.message || safeText || 'Login failed') as any;
        error.status = res.status;
        error.resetTime = (data as any)?.resetTime;
        throw error;
      }

      if (!data) {
        throw new Error(rawText || "Login failed.");
      }

      const backendUser = data.user;
      const newUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.roles[0] as UserRole,
        roles: backendUser.roles,
        organizationId: backendUser.organizationId,
        organizationSlug: backendUser.organizationSlug,
      };

      setUser(newUser);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error("Login timed out. Check your database connection and try again.");
      }
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isInitialLoading || isActionLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {isInitialLoading ? (
        <LoadingScreen message={loadingMessage} />
      ) : (
        <>
          {isActionLoading && <LoadingScreen message={loadingMessage} />}
          {children}
        </>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
