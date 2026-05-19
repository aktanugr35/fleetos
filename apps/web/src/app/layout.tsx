import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FleetOS — Fleet Management System",
  description: "Comprehensive logistics and fleet management platform for US trucking companies",
  keywords: ["fleet management", "TMS", "trucking", "logistics", "dispatch"],
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
