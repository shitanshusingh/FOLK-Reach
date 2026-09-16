"use client";
// @ts-nocheck

import { useEffect, useState } from "react";


import { PremiumSplash } from '../ui/PremiumSplash';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialization is now handled natively by Firebase listeners
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return <PremiumSplash message="Loading Workspace..." />;
  }

  return <>{children}</>;
}
