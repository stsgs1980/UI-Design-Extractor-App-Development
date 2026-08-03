import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UI Extractor - Deconstruct Any Website into Components",
  description: "Analyze websites and extract components, styles, design tokens, and patterns. Full pipeline: URL -> Teardown -> Deconstruct -> Spec -> Generate.",
  keywords: ["UI Extractor", "design tokens", "component extraction", "web analysis", "AI-powered UI"],
  authors: [{ name: "UI Extractor" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "UI Extractor",
    description: "Deconstruct any website into reusable components",
    url: "https://chat.z.ai",
    siteName: "UI Extractor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UI Extractor",
    description: "Deconstruct any website into reusable components",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
