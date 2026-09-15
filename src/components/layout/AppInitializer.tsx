// @ts-nocheck
"use client";

import { useEffect, useState } from "react";


export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialization is now handled natively by Firebase listeners
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-background)', color: 'var(--color-primary)' }}>Loading FOLKReach Workspace...</div>;
  }

  return <>{children}</>;
}
