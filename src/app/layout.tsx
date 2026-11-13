import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Inter } from "next/font/google";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Display for headings, Inter for interface text, Plex Mono for weights, reps and statistics.
const display = Barlow_Condensed({ variable: "--font-barlow-condensed", subsets: ["latin"], weight: ["500", "600", "700"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "FitTrack", template: "%s · FitTrack" },
  description: "Private gym journal for logging workouts and tracking strength progression.",
  applicationName: "FitTrack",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "FitTrack", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#101114",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
