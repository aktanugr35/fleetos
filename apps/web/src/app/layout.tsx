import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { PreventMobileZoom } from "@/components/layout/PreventMobileZoom";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Haulyard — Run your fleet from the yard",
  description: "Trucking TMS for loads, driver settlements, dispatcher pay, and DOT driver onboarding",
  keywords: ["fleet management", "TMS", "trucking", "logistics", "dispatch"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Haulyard",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-200"
        suppressHydrationWarning
      >
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <PreventMobileZoom />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
