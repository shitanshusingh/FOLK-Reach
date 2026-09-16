"use client";
// @ts-nocheck

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navigation } from './Navigation';

import { PremiumSplash } from '../ui/PremiumSplash';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !currentUser && pathname !== '/login') {
      router.replace('/login');
    } else if (!isLoading && currentUser && pathname === '/login') {
      router.replace('/');
    }
  }, [isLoading, currentUser, pathname, router]);

  if (!mounted || isLoading) {
    return <PremiumSplash message="Authenticating..." />;
  }

  // If we are on the login page, just render children without Navigation
  if (pathname === '/login') {
    if (currentUser) return null; // Wait for redirect to complete
    return <>{children}</>;
  }

  // Otherwise, if logged in, render with Navigation
  if (currentUser) {
    return <Navigation>{children}</Navigation>;
  }

  // Fallback while redirecting
  return null;
}
