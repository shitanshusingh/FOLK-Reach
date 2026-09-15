"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navigation } from './Navigation';

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-background)' }}>
        <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 600 }}>Loading...</div>
      </div>
    );
  }

  // If we are on the login page, just render children without Navigation
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Otherwise, if logged in, render with Navigation
  if (currentUser) {
    return <Navigation>{children}</Navigation>;
  }

  // Fallback while redirecting
  return null;
}
