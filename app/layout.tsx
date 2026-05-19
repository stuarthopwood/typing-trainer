import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const envLabel = process.env.VERCEL_ENV === "production" ? "" :
  process.env.VERCEL_ENV === "preview" ? " [preview]" :
  process.env.NODE_ENV === "development" ? " [dev]" : "";

export const metadata: Metadata = {
  title: `NeuralKeys${envLabel}`,
  description: "Build neural pathways through keystroke repetition — typing drills and passage practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}>
      <body className="min-h-full font-[family-name:var(--font-inter)] bg-slate-50 dark:bg-[#0d0d0d] text-slate-900 dark:text-neutral-200">
        {children}
        <span className="fixed bottom-2 right-3 text-[10px] text-neutral-700 pointer-events-none select-none">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
