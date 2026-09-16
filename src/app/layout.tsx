// @ts-nocheck
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { AppInitializer } from "@/components/layout/AppInitializer";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/layout/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FOLKReach - Relationship Management",
  description: "A platform to meet people, remember people, and follow up at the right time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FOLKReach",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppInitializer>
            <AuthGuard>
              {children}
            </AuthGuard>
          </AppInitializer>
        </AuthProvider>
      </body>
    </html>
  );
}
