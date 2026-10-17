'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Flame } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.push(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-wierd-flame/15 border border-wierd-flame/30 text-wierd-flame flex items-center justify-center mb-3">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <p className="text-xs text-wierd-muted">Verifying mess chef credentials...</p>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
