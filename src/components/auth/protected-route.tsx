'use client';

import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (!user) {
      router.replace('/'); // Redirect to root instead of /login
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      router.replace('/forbidden'); // Fixed path to /forbidden based on file structure
      return;
    }

    setIsAuthorized(true);
  }, [user, isLoading, requiredRole, router, isMounted]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
